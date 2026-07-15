# Runbook — Déploiement Prosper (staging et production)

## Prérequis

- Accès SSH au serveur cible avec clé configurée dans `~/.ssh/`
- Variables d'environnement disponibles (`.env.staging` / `.env.production`)
- Node.js 20+, pnpm 9+, pm2, PostgreSQL 16 accessibles sur le serveur cible
- Accès en écriture au répertoire `DEPLOY_TARGET_PATH`

## Variables d'environnement requises

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL |
| `JWT_SECRET` | Secret access token |
| `JWT_REFRESH_SECRET` | Secret refresh token |
| `CORS_ORIGIN` | Origines CORS autorisées |
| `CSRF_SECRET` | Secret CSRF |
| `SENTRY_DSN` | DSN Sentry API |
| `NODE_ENV` | `staging` ou `production` |
| `GIT_SHA` | SHA du commit déployé |
| `PORT` | Port d'écoute API (défaut : 3001) |

## Déploiement staging (automatique)

Déclenché automatiquement à chaque push sur `main`.
Voir `.github/workflows/deploy-staging.yml`.

### Vérification post-déploiement staging

```bash
# Health check API
curl -sf http://<staging-host>:3001/api/health | jq .

# Résultat attendu
{
  "ok": true,
  "version": "<git-sha>",
  "environment": "staging",
  "uptimeMs": <number>,
  "db": "ok"
}

# Vérification pm2
ssh <user>@<staging-host> "pm2 list"
```

## Déploiement production (manuel)

### Étape 1 — Déclencher depuis GitHub

1. Aller sur GitHub → Actions → **Deploy — Production**
2. Cliquer **Run workflow**
3. Optionnellement saisir le SHA du commit à déployer
4. Cliquer **Run workflow**

### Étape 2 — Approbation

Un approbateur désigné dans l'environnement GitHub `production` doit valider.
Délai maximum : 24h avant expiration automatique.

### Étape 3 — Vérification post-déploiement production

```bash
# Health check
curl -sf http://<prod-host>:3001/api/health | jq .

# Log pm2
ssh <user>@<prod-host> "pm2 logs prosper-api --lines 50"

# Smoke test manuel
# 1. Connexion UI
# 2. Création étude
# 3. Ajout valeur métier
# 4. Export PDF
```

## Déploiement manuel (hors CI/CD)

```bash
# Sur la machine de déploiement
cd ~/projects/Prosper
git pull origin main

# Build
pnpm install --frozen-lockfile
pnpm --filter @prosper/api build
pnpm --filter web build

# Synchronisation
rsync -azv --delete apps/api/dist/ <user>@<host>:<target>/api/dist/
rsync -azv apps/api/package.json apps/api/prisma/ <user>@<host>:<target>/api/
rsync -azv --delete apps/web/dist/ <user>@<host>:<target>/web/dist/

# Sur le serveur cible
ssh <user>@<host>
cd <target>/api
source .env.production
npm install --omit=dev
npx prisma migrate deploy
pm2 restart prosper-api --update-env
```

## Points de contrôle sécurité

- [ ] Les secrets ne sont jamais en dur dans les workflows ni dans les fichiers versionnés
- [ ] La migration Prisma est exécutée **avant** le redémarrage du process
- [ ] Le cookie httpOnly est bien positionné (`secure: true` en production)
- [ ] Le header `X-Request-Id` est présent dans les réponses API
- [ ] Sentry est initialisé (`SENTRY_DSN` non vide)

## RTO / RPO

| Indicateur | Cible |
|-----------|-------|
| RTO (redémarrage) | < 5 min |
| RPO (données) | < 24h (backup journalier) |
| RTO (rollback complet) | < 15 min |
