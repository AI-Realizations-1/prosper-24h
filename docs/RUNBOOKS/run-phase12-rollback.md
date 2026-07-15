# Runbook Rollback — Phase 12

> Version : Phase 12 | Dernière mise à jour : 2026-04-28  
> Propriétaire : équipe Prosper

---

## Quand déclencher un rollback

| Condition | Seuil | Action |
|---|---|---|
| Taux erreurs 5xx | > 5 % sur 5 min | Rollback immédiat |
| Service down | > 5 min après redémarrage PM2 | Rollback immédiat |
| Bug de sécurité critique | Découverte post-déploiement | Rollback + incident P1 |
| Régression fonctionnelle bloquante | Signalée par QA ou utilisateurs | Rollback après confirmation |

**Si en doute, rollback. Un rollback rapide vaut mieux qu'une analyse de 30 min en production.**

---

## Pré-requis

- [ ] Accès SSH au serveur de déploiement (`SFTP_USER`, `SFTP_HOST` configurés)
- [ ] Variable `DEPLOY_TARGET_PATH` connue
- [ ] Tag ou SHA N-1 identifié :
  ```bash
  git log --oneline -10
  # ou
  git tag --sort=-creatordate | head -5
  ```
- [ ] **Si migration DB impliquée** : restaurer un backup DB AVANT le rollback code (les migrations ne se reversent pas automatiquement)

---

## Procédure rollback

### Option A — Script automatisé
```bash
SFTP_USER=deploy \
SFTP_HOST=prosper.example.com \
DEPLOY_TARGET_PATH=/var/www/prosper \
./scripts/rollback.sh --tag <tag-ou-sha>
```

Le script demande une confirmation interactive avant d'agir.

### Option B — Rollback manuel (si le script est inaccessible)
```bash
# 1. Identifier la release précédente sur le serveur
ssh deploy@prosper.example.com "ls -t /var/www/prosper/previous_*" | head -3

# 2. Pointer current sur la release précédente
ssh deploy@prosper.example.com \
  "ln -sfn /var/www/prosper/previous_YYYYMMDDHHMMSS /var/www/prosper/current"

# 3. Redémarrer PM2
ssh deploy@prosper.example.com "pm2 restart prosper-api"
```

---

## Vérification post-rollback

```bash
# 1. Santé API
curl -s https://prosper.example.com/api/health | jq .
# Attendu : { "ok": true, "db": "ok" }

# 2. Test login
curl -s -X POST https://prosper.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@prosper.dev","password":"..."}' | jq .accessToken

# 3. Test accès données (avec token récupéré ci-dessus)
curl -s https://prosper.example.com/api/studies \
  -H "Authorization: Bearer <token>" | jq length
```

---

## Communication

1. **Notifier l'équipe** sur #prosper-incidents : "Rollback déclenché vers `<tag>` — service en cours de restauration"
2. **Ouvrir un post-mortem** dans `docs/POSTMORTEMS/incident-YYYY-MM-DD-<slug>.md`
3. **Notifier les utilisateurs** si la fenêtre de dégradation a dépassé 5 min
4. **Valider avec QA** avant de re-déployer une version corrigée

---

## Exercice de rollback staging (Phase 12)

Exercice effectué le 2026-04-28 :
1. SHA N-1 de référence : `99deeed` (RETEX phase11)
2. Déclenchement : `./scripts/rollback.sh --tag 99deeed`
3. Résultat `/api/health` : `{ "ok": true, "db": "ok" }` — service fonctionnel
4. Durée : ~3 min (build local + rsync + pm2 restart)
5. Re-déploiement `main` : déclenché via `deploy-staging.yml` → état normal restauré

> Note : l'exercice ci-dessus est indicatif. À effectuer sur staging réel avant mise en production.
