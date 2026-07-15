# Runbook — Rollback Prosper

## Prérequis

- Accès SSH au serveur cible
- Le répertoire `previous_<timestamp>` existe dans `DEPLOY_TARGET_PATH` (créé automatiquement lors de chaque déploiement)
- pm2 actif sur le serveur

## Identification de la version précédente

```bash
ssh <user>@<host> "ls -ldt <target>/previous_* | head -5"
```

Choisir le répertoire `previous_YYYYMMDDHHMMSS` le plus récent avant l'incident.

## Procédure de rollback API

```bash
ssh <user>@<host> << 'EOF'
set -e
PREV=$(ls -dt <target>/previous_* | head -1)
echo "Rollback vers : $PREV"

# Remplacer le dist courant
cp -r "$PREV/api/dist" <target>/api/dist
cp -r "$PREV/api/package.json" <target>/api/package.json

# Redémarrer
cd <target>/api
source .env.production
pm2 restart prosper-api --update-env
EOF
```

> ⚠️ Si la version précédente utilise un schéma DB différent, ne pas redémarrer sans vérification de compatibilité.

## Rollback base de données (migration)

Prisma ne supporte pas le rollback de migration natif. Procédure :

```bash
ssh <user>@<host>
cd <target>/api
source .env.production

# Lister les migrations appliquées
npx prisma migrate status

# Si la dernière migration doit être annulée, utiliser un script SQL de rollback
# préparé lors de la migration (voir docs/migrations/<migration-name>.down.sql)
psql "$DATABASE_URL" < docs/migrations/<migration-name>.down.sql
```

> Chaque migration critique doit être accompagnée d'un script `.down.sql` dans `docs/migrations/`.

## Rollback frontend (web)

Le frontend est un build statique. Rollback en restaurant le dist précédent :

```bash
ssh <user>@<host>
PREV=$(ls -dt <target>/previous_* | head -1)
cp -r "$PREV/web/dist" <target>/web/dist
# Recharger le serveur web (nginx/caddy/serve)
systemctl reload nginx
```

## Vérification post-rollback

```bash
# Health check
curl -sf http://<host>:3001/api/health | jq .

# Vérifier la version rollbackée
curl -sf http://<host>:3001/api/health | jq '.version'

# Logs
ssh <user>@<host> "pm2 logs prosper-api --lines 30"
```

## Points de contrôle sécurité

- [ ] Vérifier que la migration rollback ne corrompt pas les données existantes
- [ ] Confirmer que les cookies de session existants restent valides après rollback
- [ ] Notifier les utilisateurs d'une éventuelle interruption de service

## RTO cible

| Opération | Durée cible |
|-----------|------------|
| Rollback API (pm2) | < 5 min |
| Rollback frontend | < 2 min |
| Rollback DB (si nécessaire) | < 15 min |
| Validation complète post-rollback | < 10 min |
