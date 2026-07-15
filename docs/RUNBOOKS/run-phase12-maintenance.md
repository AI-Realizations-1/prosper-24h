# Runbook Maintenance — Phase 12

> Version : Phase 12 | Dernière mise à jour : 2026-04-28  
> Propriétaire : équipe Prosper

---

## 1. Purge des tokens expirés

### Exécution manuelle
```bash
DATABASE_URL="postgresql://prosper:prosper@localhost:5432/prosper" \
  ./scripts/purge-expired-tokens.sh
```

### Résultat attendu
```
2026-04-28 03:00:00 — Purge tokens expirés : 14 ligne(s) supprimée(s)
```

### Configuration crontab (sur le serveur)
```bash
crontab -e
# Ajouter :
0 3 * * * DATABASE_URL="postgresql://prosper:PASS@localhost:5432/prosper" \
  /var/www/prosper/scripts/purge-expired-tokens.sh \
  >> /var/log/prosper-purge.log 2>&1
```

### Vérification du log
```bash
tail -20 /var/log/prosper-purge.log
```

---

## 2. Vérification d'intégrité des backups

### Exécution manuelle
```bash
BACKUP_DESTINATION=sftp \
  SFTP_USER=backup \
  SFTP_HOST=backup.example.com \
  SFTP_TARGET_PATH=/backups/prosper \
  ./scripts/verify-backup.sh
```

### Critère de succès
```
[verify] OK — dump intègre, 524288 octets déchiffrés.
```

### Critère d'échec
```
[verify] ERREUR : dump déchiffré trop petit (0 octets)
```
→ Contacter l'équipe, vérifier la clé GPG disponible dans l'environnement, re-déclencher un backup manuel.

---

## 3. Rotation du secret JWT

> À effectuer si le secret est compromis ou en rotation de sécurité planifiée.  
> Conséquence : **toutes les sessions actives seront invalidées**. Prévoir une communication utilisateurs.

### Étapes
1. Générer un nouveau secret :
   ```bash
   openssl rand -base64 64
   ```
2. Mettre à jour le secret GitHub :
   ```
   GitHub → Settings → Secrets → JWT_SECRET → Update
   GitHub → Settings → Secrets → JWT_REFRESH_SECRET → Update
   ```
3. Mettre à jour la variable d'environnement sur le serveur :
   ```bash
   ssh deploy@prosper.example.com
   nano /var/www/prosper/.env
   # Mettre à jour JWT_SECRET et JWT_REFRESH_SECRET
   ```
4. Vider la table `refresh_tokens` (tous les tokens existants sont obsolètes) :
   ```sql
   psql "$DATABASE_URL" -c "TRUNCATE refresh_tokens;"
   ```
5. Redémarrer l'API :
   ```bash
   pm2 restart prosper-api
   ```
6. Vérifier la santé :
   ```bash
   curl https://prosper.example.com/api/health | jq .
   ```
7. Communiquer aux utilisateurs qu'une reconnexion est nécessaire.

---

## 4. Rotation de la clé GPG de backup

> À effectuer lors du renouvellement de la clé GPG de chiffrement des backups.

### Étapes
1. Générer une nouvelle paire de clés GPG :
   ```bash
   gpg --full-generate-key
   # Choisir : RSA 4096, pas d'expiration, email backup@prosper.example.com
   ```
2. Exporter la clé publique :
   ```bash
   gpg --armor --export backup@prosper.example.com > prosper-backup-pubkey.asc
   ```
3. Mettre à jour le secret GitHub :
   ```
   GitHub → Settings → Secrets → GPG_BACKUP_RECIPIENT → Update (fingerprint ou email)
   ```
4. Tester le nouveau backup :
   ```bash
   DATABASE_URL="..." GPG_RECIPIENT="nouveau@example.com" ./scripts/backup.sh
   ./scripts/verify-backup.sh
   ```
5. Conserver l'ancienne clé privée au moins 30 jours pour déchiffrer les anciens backups.
