# Runbook — Sauvegarde et restauration base de données Prosper

## Prérequis

- Accès SSH au serveur PostgreSQL
- `pg_dump` et `psql` disponibles sur le serveur
- Espace disque suffisant dans le répertoire de backup

## Sauvegarde

### Script de sauvegarde horodatée

```bash
#!/usr/bin/env bash
# scripts/backup-db.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/prosper}"
DB_URL="${DATABASE_URL:?DATABASE_URL is required}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/prosper_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Démarrage : $BACKUP_FILE"
pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"
echo "[backup] Terminé : $(du -sh "$BACKUP_FILE" | cut -f1)"

# Purge des sauvegardes de plus de 30 jours
find "$BACKUP_DIR" -name "prosper_*.sql.gz" -mtime +30 -delete
echo "[backup] Purge anciens backups OK"
```

```bash
# Exécution
chmod +x scripts/backup-db.sh
DATABASE_URL="postgresql://prosper:prosper@localhost:5432/prosper" ./scripts/backup-db.sh
```

### Planification cron (exemple)

```bash
# Sauvegarde quotidienne à 3h00
0 3 * * * DATABASE_URL="<url>" /opt/prosper/scripts/backup-db.sh >> /var/log/prosper-backup.log 2>&1
```

## Restauration

### Script de restauration contrôlé

```bash
#!/usr/bin/env bash
# scripts/restore-db.sh
set -euo pipefail

BACKUP_FILE="${1:?Usage: restore-db.sh <backup-file.sql.gz>}"
DB_URL="${DATABASE_URL:?DATABASE_URL is required}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[restore] Fichier introuvable : $BACKUP_FILE"
  exit 1
fi

echo "[restore] Fichier : $BACKUP_FILE"
echo "[restore] Cible   : $DB_URL"
echo "[restore] ATTENTION : cette opération écrase la base existante."
read -r -p "Confirmer ? (oui/NON) : " CONFIRM

if [ "$CONFIRM" != "oui" ]; then
  echo "[restore] Annulé."
  exit 0
fi

echo "[restore] Décompression et restauration..."
gunzip -c "$BACKUP_FILE" | psql "$DB_URL"
echo "[restore] Restauration terminée."
```

```bash
# Exécution
chmod +x scripts/restore-db.sh
DATABASE_URL="postgresql://prosper:prosper@localhost:5432/prosper" \
  ./scripts/restore-db.sh /var/backups/prosper/prosper_20260428_030000.sql.gz
```

## Test de restauration sur base de staging

```bash
# 1. Créer une base de test
createdb -U prosper prosper_restore_test

# 2. Restaurer la sauvegarde sur la base de test
DB_URL_TEST="postgresql://prosper:prosper@localhost:5432/prosper_restore_test"
gunzip -c /var/backups/prosper/prosper_<TIMESTAMP>.sql.gz | psql "$DB_URL_TEST"

# 3. Vérifier l'intégrité
psql "$DB_URL_TEST" -c "
  SELECT 
    (SELECT count(*) FROM \"User\") AS users,
    (SELECT count(*) FROM \"Study\") AS studies,
    (SELECT count(*) FROM \"BusinessValue\") AS business_values;
"

# 4. Nettoyer
dropdb -U prosper prosper_restore_test
```

## Vérifications post-restauration

```bash
# Reconnexion de l'API
pm2 restart prosper-api --update-env

# Health check avec vérification DB
curl -sf http://localhost:3001/api/health | jq '.db'
# Résultat attendu : "ok"

# Test fonctionnel minimal
# 1. Se connecter via l'UI
# 2. Vérifier la présence des études
```

## Points de contrôle sécurité

- [ ] Les fichiers de backup ne sont pas accessibles publiquement
- [ ] Les backups sont chiffrés si stockés hors serveur (`gpg --encrypt` ou solution cloud sécurisée)
- [ ] La confirmation manuelle est requise avant toute restauration en production
- [ ] Tester la restauration sur staging avant de l'appliquer en production

## RPO / RTO

| Indicateur | Cible |
|-----------|-------|
| RPO (fréquence backup) | 24h (backup journalier) |
| RTO (restauration complète) | < 30 min |
| Test de restauration | Mensuel minimum |
