# Prompt Agent — Phase 11 : Monitoring Avancé et Auth Hardening

## Contexte et prérequis
- Répertoire : ~/projects/Prosper/
- Phase 10 complétée : CD staging/prod, pino + Sentry init, cookie httpOnly, CSRF, runbooks ops
- Commit de référence : `c95374a`
- Contrainte maintenue : pas de Docker

## Périmètre Phase 11

| Livrable | Description |
|----------|-------------|
| P11-01 | Auth hardening : révocation serveur refresh tokens + intercepteur auto-refresh 401 |
| P11-02 | Alertes Sentry actives + notifications (Slack ou email) |
| P11-03 | Provisionning environments GitHub (staging + production avec protection rules) |
| P11-04 | Chiffrement GPG des backups DB + archivage hors-site |
| P11-05 | SLO minimal + runbook on-call opérationnel |

---

## ÉTAPE 1 — Auth hardening : révocation refresh tokens (P11-01)

### 1a — Modèle Prisma : table RefreshToken

Ajouter dans `apps/api/prisma/schema.prisma` :

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  revokedAt DateTime?
}
```

Ajouter la relation inverse dans le modèle `User` :

```prisma
refreshTokens RefreshToken[]
```

Puis migrer :

```bash
cd apps/api
pnpm prisma migrate dev --name add-refresh-token-table
pnpm prisma generate
```

### 1b — Stocker et valider le refresh token côté serveur

Dans `apps/api/src/routes/auth.ts`, à la génération du refresh token (login + refresh) :

1. Créer une entrée `RefreshToken` en base avec `token`, `userId`, `expiresAt`.
2. À chaque appel `/api/auth/refresh` :
   - Vérifier que le token existe en base ET `revokedAt IS NULL` ET `expiresAt > now()`.
   - Si invalide : retourner `401 Unauthorized`.
   - Si valide : révoquer l'ancien (`revokedAt = now()`), émettre un nouveau token, créer une nouvelle entrée.
3. Au logout (`/api/auth/logout`) :
   - Révoquer le refresh token courant en base.
   - Supprimer le cookie `prosper_refresh`.

### 1c — Purge automatique des tokens expirés

Ajouter dans `apps/api/src/index.ts` un job de nettoyage journalier :

```typescript
setInterval(async () => {
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}, 24 * 60 * 60 * 1000);
```

### 1d — Intercepteur auto-refresh 401 côté frontend

Dans `apps/web/src/context/AuthContext.tsx`, ajouter un utilitaire `fetchWithAuth` :

```typescript
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  accessToken: string | null,
  refreshAccessToken: () => Promise<string | null>
): Promise<Response> {
  const headers = {
    ...options.headers,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  let res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
      });
    }
  }
  return res;
}
```

Exposer `fetchWithAuth` et `refreshAccessToken` depuis le contexte auth.
Remplacer les appels `fetch` avec Bearer token dans les hooks existants par `fetchWithAuth`.

---

## ÉTAPE 2 — Alertes Sentry actives (P11-02)

### 2a — Règles d'alerte Sentry (interface)

Dans le projet Sentry, configurer :
1. **Taux d'erreurs API** : trigger si > 5 erreurs/5min → notification Slack/email
2. **Performance** : trigger si p95 latence > 2000ms → notification email
3. **Uptime monitor** : sur `/api/health` toutes les 5min → alerte si indisponible

### 2b — Upload des sourcemaps Web en CI

Ajouter dans `.github/workflows/deploy-staging.yml` et `deploy-production.yml` après le build Web :

```yaml
      - name: Upload Sentry sourcemaps
        working-directory: apps/web
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        run: |
          pnpm add -D @sentry/cli
          npx sentry-cli releases new "${{ github.sha }}"
          npx sentry-cli releases files "${{ github.sha }}" upload-sourcemaps dist --url-prefix '~/'
          npx sentry-cli releases finalize "${{ github.sha }}"
```

### 2c — Injecter GIT_SHA dans le build Web

Dans `apps/web/vite.config.ts`, ajouter :

```typescript
define: {
  __COMMIT_SHA__: JSON.stringify(process.env.GIT_SHA ?? 'dev'),
},
```

Dans `apps/web/src/main.tsx` :

```typescript
declare const __COMMIT_SHA__: string;

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: __COMMIT_SHA__,
    environment: import.meta.env.VITE_ENV ?? 'development',
    tracesSampleRate: 0.2,
  });
}
```

---

## ÉTAPE 3 — Provisionning environments GitHub (P11-03)

### 3a — Créer les environments dans GitHub Settings

**Settings → Environments → New environment**

Créer `staging` : pas d'approbation requise.
Créer `production` : approbation manuelle obligatoire, uniquement depuis `main`.

Secrets à créer dans chaque environnement :

| Secret | Usage |
|--------|-------|
| `DATABASE_URL` | Connexion PostgreSQL |
| `JWT_SECRET` | Signature access tokens |
| `JWT_REFRESH_SECRET` | Signature refresh tokens |
| `CORS_ORIGIN` | Origine autorisée frontend |
| `CSRF_SECRET` | HMAC CSRF tokens |
| `SENTRY_DSN_API` | Sentry backend |
| `SENTRY_DSN_WEB` | Sentry frontend |
| `SENTRY_AUTH_TOKEN` | Upload sourcemaps |
| `SENTRY_ORG` | Organisation Sentry |
| `SENTRY_PROJECT` | Projet Sentry |
| `DEPLOY_SSH_HOST` | Adresse serveur cible |
| `DEPLOY_SSH_USER` | Utilisateur SSH |
| `DEPLOY_SSH_KEY` | Clé privée SSH (PEM) |
| `DEPLOY_TARGET_PATH` | Répertoire cible sur le serveur |
| `GPG_BACKUP_RECIPIENT` | Fingerprint ou email clé GPG backup |

### 3b — Référencer les environments dans les workflows CD

`deploy-staging.yml` :
```yaml
    environment:
      name: staging
      url: https://staging.prosper.example.com
```

`deploy-production.yml` :
```yaml
    environment:
      name: production
      url: https://prosper.example.com
```

---

## ÉTAPE 4 — Chiffrement GPG des backups DB (P11-04)

### 4a — Créer `scripts/backup.sh`

```bash
#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_prosper_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

pg_dump "$DATABASE_URL" > "/tmp/${BACKUP_FILE}"

gpg --batch --yes --encrypt --recipient "$GPG_RECIPIENT" \
  --output "/tmp/${ENCRYPTED_FILE}" \
  "/tmp/${BACKUP_FILE}"

rm "/tmp/${BACKUP_FILE}"
echo "Backup chiffré : /tmp/${ENCRYPTED_FILE}"
```

### 4b — Créer `scripts/restore.sh`

```bash
#!/bin/bash
set -euo pipefail

ENCRYPTED_FILE="$1"
[ -z "$ENCRYPTED_FILE" ] && echo "Usage: ./restore.sh <fichier.sql.gpg>" && exit 1

DECRYPTED_FILE="${ENCRYPTED_FILE%.gpg}"

echo "RESTAURATION BASE — ÊTES-VOUS SÛR ? (yes/no)"
read -r CONFIRM
[ "$CONFIRM" != "yes" ] && echo "Annulé." && exit 0

gpg --batch --yes --decrypt --output "/tmp/${DECRYPTED_FILE}" "$ENCRYPTED_FILE"
psql "$DATABASE_URL" < "/tmp/${DECRYPTED_FILE}"
rm "/tmp/${DECRYPTED_FILE}"
echo "Restauration terminée."
```

### 4c — Step backup pré-déploiement dans deploy-staging.yml

Ajouter avant le step de déploiement SSH :

```yaml
      - name: Backup DB pre-deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          GPG_RECIPIENT: ${{ secrets.GPG_BACKUP_RECIPIENT }}
        run: |
          chmod +x scripts/backup.sh
          ./scripts/backup.sh
```

---

## ÉTAPE 5 — SLO minimal et runbook on-call (P11-05)

### 5a — Créer `docs/SLO.md`

```markdown
# SLO — Prosper

| Indicateur | Objectif | Mesure |
|-----------|---------|--------|
| Disponibilité | ≥ 99,5% / mois | Uptime monitor Sentry sur /api/health |
| Latence p95 API | < 500ms | Sentry Performance |
| Latence p99 API | < 2000ms | Sentry Performance |
| Taux erreurs 5xx | < 1% des requêtes | Sentry Issues |
| RTO (reprise activité) | ≤ 30 min | Runbook deploy + rollback |
| RPO (perte de données max) | ≤ 24h | Backup quotidien |
```

### 5b — Créer `docs/RUNBOOKS/run-phase11-oncall.md`

Contenu requis — 6 scénarios minimum, chacun avec : symptôme, diagnostic, action immédiate, action de fond, critère de résolution :

1. **API down** : vérifier `/api/health` → vérifier pm2 → vérifier DB → rollback si régression
2. **Taux d'erreurs élevé** : consulter Sentry Issues → identifier scope → hotfix ou rollback
3. **DB unreachable** : vérifier connexion → vérifier quotas → restaurer backup si corruption
4. **Déploiement bloqué** : annuler workflow → rollback N-1 → investiguer logs
5. **Token CSRF rejeté massivement** : vérifier secret CSRF en env → redéployer si secret rotation
6. **Refresh token invalide massif** : vérifier table `RefreshToken` → vérifier secret JWT → forcer reconnexion

---

## ÉTAPE 6 — Validation technique complète

```bash
cd ~/projects/Prosper
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma generate
pnpm --filter api lint
pnpm --filter web lint
pnpm --filter api build
pnpm --filter web build
pnpm --filter api test:coverage
pnpm --filter web test:coverage
pnpm --filter e2e test:e2e
```

Validations manuelles obligatoires :
- Logout → tentative refresh → `401` retourné (token révoqué en DB)
- Access token expiré → intercepteur déclenche refresh → requête réussie
- `scripts/backup.sh` → fichier `.gpg` produit
- `scripts/restore.sh` sur staging → données intègres

---

## ÉTAPE 7 — Mise à jour registres

- `.github/prompts/README.md` : phase10 → completed, phase11 → ready
- `RETEX/prompts-used.yaml` : idem

---

## ÉTAPE 8 — Commit et push

```bash
cd ~/projects/Prosper
git add -A
git commit -m "feat: phase11 monitoring avancé, auth hardening (révocation tokens, intercepteur 401, Sentry alertes, GPG backups, SLO, on-call)"
git push origin main
```

---

## ÉTAPE 9 — RETEX Phase 11

Créer `RETEX/phase11-monitoring-auth-hardening-$(date +%Y-%m-%d).md` avec livrables, incidents, décisions, limites, prochaines priorités.

---

## Contraintes

1. Ne pas modifier la logique métier des ateliers EBIOS RM.
2. Pas de Docker.
3. Pas de secret en dur dans les workflows ou le code.
4. Table `RefreshToken` migrée via Prisma migrate, pas manuellement.
5. `backup.sh` et `restore.sh` exigent `DATABASE_URL` explicite.
6. Runbook on-call exécuté sur au moins 2 scénarios avant de clore la phase.

---

## Critères d'acceptation fin de phase

- Révocation refresh token : logout invalide le token en base, réutilisation retourne 401.
- Intercepteur 401 frontend déclenche refresh automatique sans déconnexion visible.
- Alertes Sentry configurées et testées (erreur volontaire → notification reçue).
- Environments GitHub `staging` et `production` créés avec protection rules et secrets complets.
- Backup chiffré GPG produit et restauré une fois sur staging avec succès.
- `docs/SLO.md` créé.
- `docs/RUNBOOKS/run-phase11-oncall.md` créé et exécuté sur 2 scénarios.
- CI/CD verte sur main.
