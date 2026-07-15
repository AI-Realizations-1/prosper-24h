# Prompt Agent — Phase 12 : Résilience Complète & Hardening Final

## Contexte et prérequis
- Répertoire : ~/projects/Prosper/
- Phase 11 complétée : révocation refresh tokens, Sentry Web, GitHub Environments, backups GPG locaux, SLO, runbook on-call
- Commit de référence : `0b220b4` (code) · `be8b92c` (docs)
- Contrainte maintenue : pas de Docker

## Périmètre Phase 12

| Livrable | Description |
|----------|-------------|
| P12-01 | Backups GPG hors-site : transfert SFTP après chaque backup + script `verify-backup.sh` en CI |
| P12-02 | Auth multi-device : `POST /api/auth/logout-all` + `GET /api/auth/sessions` + bouton UI |
| P12-03 | Purge cron fiable : suppression du `setInterval` → script `purge-expired-tokens.sh` + crontab |
| P12-04 | Load testing K6 : scénarios charge auth + studies, seuils SLO inline, workflow `workflow_dispatch` |
| P12-05 | Rollback opérationnel : `rollback.sh --tag`, exercice staging documenté, 3 runbooks Phase 12 |

---

## ÉTAPE 1 — Backups GPG hors-site (P12-01)

### 1a — Modifier `scripts/backup.sh`

Ajouter après la ligne `gpg ... --output "/tmp/${ENCRYPTED_FILE}"` :

```bash
# Transfert hors-site (SFTP par défaut, bascule S3 via BACKUP_DESTINATION=s3)
BACKUP_DESTINATION="${BACKUP_DESTINATION:-sftp}"

if [ "$BACKUP_DESTINATION" = "s3" ]; then
  aws s3 cp "/tmp/${ENCRYPTED_FILE}" "s3://${BACKUP_S3_BUCKET}/prosper/${ENCRYPTED_FILE}"
  echo "Backup uploadé sur S3 : s3://${BACKUP_S3_BUCKET}/prosper/${ENCRYPTED_FILE}"
else
  scp "/tmp/${ENCRYPTED_FILE}" "${SFTP_USER}@${SFTP_HOST}:${SFTP_TARGET_PATH}/${ENCRYPTED_FILE}"
  echo "Backup transféré via SFTP : ${SFTP_HOST}:${SFTP_TARGET_PATH}/${ENCRYPTED_FILE}"
fi

rm "/tmp/${ENCRYPTED_FILE}"
```

Variables d'environnement requises pour SFTP : `SFTP_HOST`, `SFTP_USER`, `SFTP_TARGET_PATH`.  
Pour la bascule S3 future : `BACKUP_DESTINATION=s3`, `BACKUP_S3_BUCKET`.

### 1b — Créer `scripts/verify-backup.sh`

```bash
#!/bin/bash
set -euo pipefail

# Vérifie l'intégrité du dernier backup en le téléchargeant et déchiffrant
VERIFY_DIR=$(mktemp -d)
trap 'rm -rf "$VERIFY_DIR"' EXIT

BACKUP_DESTINATION="${BACKUP_DESTINATION:-sftp}"

if [ "$BACKUP_DESTINATION" = "s3" ]; then
  LATEST=$(aws s3 ls "s3://${BACKUP_S3_BUCKET}/prosper/" | sort | tail -1 | awk '{print $4}')
  aws s3 cp "s3://${BACKUP_S3_BUCKET}/prosper/${LATEST}" "${VERIFY_DIR}/${LATEST}"
else
  LATEST=$(ssh "${SFTP_USER}@${SFTP_HOST}" "ls -t ${SFTP_TARGET_PATH}/*.gpg | head -1")
  scp "${SFTP_USER}@${SFTP_HOST}:${LATEST}" "${VERIFY_DIR}/latest.sql.gpg"
  LATEST="${VERIFY_DIR}/latest.sql.gpg"
fi

gpg --batch --yes --decrypt --output "${VERIFY_DIR}/verify.sql" "${VERIFY_DIR}/$(basename "${LATEST}")" 2>/dev/null

SIZE=$(wc -c < "${VERIFY_DIR}/verify.sql")
[ "$SIZE" -lt 100 ] && echo "ERREUR : dump déchiffré trop petit (${SIZE} octets)" && exit 1

echo "Vérification OK : dump ${SIZE} octets, fichier intègre."
```

### 1c — Ajouter le step dans les workflows CD

Dans `deploy-staging.yml` et `deploy-production.yml`, ajouter **après** le step `Backup DB pre-deploy` :

```yaml
      - name: Verify backup integrity
        if: ${{ secrets.SFTP_HOST != '' }}
        env:
          SFTP_USER: ${{ secrets.SFTP_USER }}
          SFTP_HOST: ${{ secrets.SFTP_HOST }}
          SFTP_TARGET_PATH: ${{ secrets.SFTP_TARGET_PATH }}
          BACKUP_DESTINATION: sftp
        run: |
          chmod +x scripts/verify-backup.sh
          ./scripts/verify-backup.sh
```

Secrets à ajouter dans les deux environments GitHub (`staging` et `production`) :
- `SFTP_HOST`
- `SFTP_USER`
- `SFTP_KEY` (clé privée SSH)
- `SFTP_TARGET_PATH`

---

## ÉTAPE 2 — Auth multi-device (P12-02)

### 2a — Méthodes dans `AuthService`

Ajouter dans `apps/api/src/services/authService.ts` :

```typescript
async revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

async listActiveSessions(userId: string): Promise<Array<{
  id: string;
  createdAt: Date;
  expiresAt: Date;
}>> {
  return prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
}
```

### 2b — Routes dans `apps/api/src/routes/auth.ts`

Ajouter après la route `logout` :

```typescript
// POST /api/auth/logout-all — révoque tous les refresh tokens de l'utilisateur
router.post('/logout-all', requireAuth, async (req: Request, res: Response) => {
  await authService.revokeAllRefreshTokens(req.user!.id);
  res.clearCookie('prosper_refresh', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ message: 'Toutes les sessions révoquées.' });
});

// GET /api/auth/sessions — liste les sessions actives de l'utilisateur courant
router.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  const sessions = await authService.listActiveSessions(req.user!.id);
  res.json({ sessions });
});
```

`requireAuth` est le middleware JWT existant (déjà utilisé sur les routes protégées).

### 2c — Bouton UI "Déconnecter tous les appareils"

Dans `apps/web/src/`, identifier la page profil ou le menu utilisateur existant, et ajouter :

```typescript
const handleLogoutAll = async () => {
  await fetchWithAuth(
    '/api/auth/logout-all',
    { method: 'POST' },
    accessToken,
    refreshAccessToken
  );
  logout(); // déconnecte la session courante côté client
};
```

Ajouter un bouton visible uniquement si l'utilisateur est authentifié.

### 2d — Tests

Ajouter dans `apps/api/` (suite tests auth) :
1. `POST /api/auth/logout-all` → tous les `RefreshToken` de l'utilisateur supprimés en base
2. `GET /api/auth/sessions` → retourne uniquement les tokens actifs (non révoqués, non expirés)
3. Tentative refresh avec token révoqué par `logout-all` → `401`

---

## ÉTAPE 3 — Purge cron fiable (P12-03)

### 3a — Supprimer le setInterval dans `apps/api/src/index.ts`

Retirer le bloc :

```typescript
setInterval(async () => {
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}, 24 * 60 * 60 * 1000);
```

### 3b — Créer `scripts/purge-expired-tokens.sh`

```bash
#!/bin/bash
set -euo pipefail

[ -z "${DATABASE_URL:-}" ] && echo "DATABASE_URL manquant" && exit 1

DELETED=$(psql "$DATABASE_URL" -t -c \
  "DELETE FROM \"RefreshToken\" WHERE \"expiresAt\" < NOW(); SELECT ROW_COUNT();" \
  2>/dev/null | tr -d ' ')

echo "$(date '+%Y-%m-%d %H:%M:%S') — Purge tokens expirés : ${DELETED} ligne(s) supprimée(s)"
```

### 3c — Entrée crontab (à documenter dans le runbook, pas à automatiser en CI)

```
0 3 * * * DATABASE_URL="postgresql://..." /path/to/prosper/scripts/purge-expired-tokens.sh >> /var/log/prosper-purge.log 2>&1
```

---

## ÉTAPE 4 — Load testing K6 (P12-04)

### 4a — Créer `apps/load-test/scenarios/auth.k6.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const EMAIL = __ENV.E2E_EMAIL || 'test@prosper.dev';
const PASSWORD = __ENV.E2E_PASSWORD || 'password123';

export default function () {
  // Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, { 'login 200': (r) => r.status === 200 });
  const token = loginRes.json('accessToken');

  sleep(0.5);

  // Accès protégé
  const studiesRes = http.get(`${BASE_URL}/api/studies`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(studiesRes, { 'studies 200': (r) => r.status === 200 });

  sleep(0.5);

  // Logout
  const logoutRes = http.post(
    `${BASE_URL}/api/auth/logout`,
    null,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  check(logoutRes, { 'logout 200': (r) => r.status === 200 });

  sleep(1);
}
```

### 4b — Créer `apps/load-test/scenarios/studies.k6.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.API_TOKEN || '';

export default function () {
  const res = http.get(`${BASE_URL}/api/studies`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  check(res, {
    'status 200': (r) => r.status === 200,
    'body non vide': (r) => r.body.length > 0,
  });
  sleep(1);
}
```

### 4c — Créer `.github/workflows/load-test.yml`

```yaml
name: Load Test (K6)

on:
  workflow_dispatch:
    inputs:
      base_url:
        description: 'URL cible (ex: https://staging.prosper.example.com)'
        required: true
        default: 'https://staging.prosper.example.com'
      scenario:
        description: 'Scénario à exécuter'
        required: true
        default: 'auth'
        type: choice
        options:
          - auth
          - studies

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install K6
        run: |
          curl -s https://packagecloud.io/install/repositories/loadimpact/k6/script.deb.sh | sudo bash
          sudo apt-get install -y k6

      - name: Run K6 scenario
        env:
          BASE_URL: ${{ github.event.inputs.base_url }}
          E2E_EMAIL: ${{ secrets.E2E_EMAIL }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
        run: |
          k6 run \
            --out json=k6-results.json \
            -e BASE_URL="$BASE_URL" \
            -e E2E_EMAIL="$E2E_EMAIL" \
            -e E2E_PASSWORD="$E2E_PASSWORD" \
            apps/load-test/scenarios/${{ github.event.inputs.scenario }}.k6.js

      - name: Archive K6 results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-results-${{ github.event.inputs.scenario }}-${{ github.run_id }}
          path: k6-results.json
          retention-days: 30
```

---

## ÉTAPE 5 — Rollback opérationnel (P12-05)

### 5a — Créer `scripts/rollback.sh`

```bash
#!/bin/bash
set -euo pipefail

usage() {
  echo "Usage: ./rollback.sh --tag <git-tag-ou-sha>"
  echo "  Exemple : ./rollback.sh --tag v1.2.3"
  exit 1
}

TAG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) TAG="$2"; shift 2 ;;
    *) usage ;;
  esac
done

[ -z "$TAG" ] && usage

DEPLOY_PATH="${DEPLOY_TARGET_PATH:?Variable DEPLOY_TARGET_PATH manquante}"

echo "=== ROLLBACK vers $TAG ==="
echo "Cible : $DEPLOY_PATH"
echo ""
echo "Êtes-vous sûr ? (yes/no)"
read -r CONFIRM
[ "$CONFIRM" != "yes" ] && echo "Annulé." && exit 0

# Checkout du tag en local pour rebuild
git fetch --tags
git checkout "$TAG"

echo "--- Build API ---"
pnpm --filter api build

echo "--- Build Web ---"
pnpm --filter web build

echo "--- Déploiement API vers $DEPLOY_PATH ---"
rsync -az --delete apps/api/dist/ "${SFTP_USER}@${SFTP_HOST}:${DEPLOY_PATH}/api/dist/"
rsync -az --delete apps/api/package.json "${SFTP_USER}@${SFTP_HOST}:${DEPLOY_PATH}/api/"
rsync -az --delete apps/api/prisma/ "${SFTP_USER}@${SFTP_HOST}:${DEPLOY_PATH}/api/prisma/"

echo "--- Déploiement Web vers $DEPLOY_PATH ---"
rsync -az --delete apps/web/dist/ "${SFTP_USER}@${SFTP_HOST}:${DEPLOY_PATH}/web/dist/"

echo "--- Redémarrage pm2 ---"
ssh "${SFTP_USER}@${SFTP_HOST}" "cd ${DEPLOY_PATH}/api && npm install --omit=dev && pm2 restart prosper-api"

echo "=== Rollback terminé. Vérifier /api/health ==="
```

### 5b — Exercice staging obligatoire

Avant de clore la phase, documenter dans le RETEX :
1. Déployer la version courante (`main`) sur staging — noter le SHA
2. Déclencher `deploy-staging.yml` avec un commit factice pour créer l'état N (ex: commentaire dans `README.md`)
3. Lancer `./scripts/rollback.sh --tag <sha-N-1>` depuis le poste local ou en SSH
4. Vérifier `/api/health` → 200, naviguer dans l'UI → fonctionnel
5. Re-déployer `main` → état normal restauré

### 5c — Créer `docs/RUNBOOKS/run-phase12-maintenance.md`

Sections requises :
- Purge tokens expirés : commande `scripts/purge-expired-tokens.sh` + lecture log
- Vérification backup : commande `scripts/verify-backup.sh` + critère de succès
- Rotation secret JWT : étapes (générer → mettre à jour secret GitHub → re-déployer)
- Rotation clé GPG : étapes (générer → mettre à jour `GPG_BACKUP_RECIPIENT` → tester backup)

### 5d — Créer `docs/RUNBOOKS/run-phase12-rollback.md`

Sections requises :
- Quand rollback : critères de déclenchement (taux 5xx > 5%, service down > 5min)
- Pré-requis : accès SSH, `SFTP_USER`/`SFTP_HOST` disponibles, tag N-1 identifié
- Procédure `scripts/rollback.sh --tag <tag>`
- Vérification post-rollback : `/api/health`, test login, test accès données
- Communication : notifier équipe + ouvrir post-mortem

### 5e — Créer `docs/RUNBOOKS/run-phase12-load-test.md`

Sections requises :
- Déclenchement : GitHub Actions → "Load Test (K6)" → workflow_dispatch
- Lecture résultat K6 : décrire chaque métrique clé (`http_req_duration`, `http_req_failed`, `vus`)
- Interprétation SLO : p95 < 500ms = vert, p95 500ms-1s = orange, p95 > 1s = rouge
- Actions si seuils dépassés : investiguer pino logs, Sentry performance, optimiser requêtes Prisma

---

## ÉTAPE 6 — Validation technique complète

```bash
cd ~/projects/Prosper
pnpm --filter api lint
pnpm --filter web lint
pnpm --filter api build
pnpm --filter web build
pnpm --filter api test:coverage
pnpm --filter web test:coverage
```

Validations manuelles obligatoires :
- `logout-all` → tous les `RefreshToken` de l'utilisateur supprimés en base, refresh → 401
- `GET /api/auth/sessions` → retourne uniquement les sessions actives
- `scripts/backup.sh` → fichier `.gpg` transféré sur SFTP distant
- `scripts/verify-backup.sh` → téléchargement + déchiffrement OK
- K6 `auth.k6.js` sur staging → p95 < 500ms, errors < 1%
- `scripts/rollback.sh --tag <N-1>` exercé sur staging → `/api/health` 200 après rollback

---

## ÉTAPE 7 — Mise à jour registres

- `.github/prompts/README.md` : phase11 → completed, phase12 → ready
- `RETEX/prompts-used.yaml` : idem

---

## ÉTAPE 8 — Commit et push

```bash
cd ~/projects/Prosper
git add -A
git commit -m "feat: phase12 résilience complète (backup SFTP, auth multi-device, purge cron, K6, rollback)"
git push origin main
```

---

## ÉTAPE 9 — RETEX Phase 12

Créer `RETEX/phase12-resilience-hardening-final-$(date +%Y-%m-%d).md` avec :
- Livrables validés (tableau)
- Résultats K6 (métriques p95/p99 constatées)
- Exercice rollback (SHA N-1, durée, résultat)
- Incidents rencontrés
- Décisions techniques
- Limites connues
- Prochaines priorités (si projet poursuit)

---

## Contraintes

1. Ne pas modifier la logique métier des ateliers EBIOS RM.
2. Pas de Docker.
3. Pas de secret en dur dans les scripts ou les workflows.
4. `verify-backup.sh` exige que la clé GPG soit disponible dans l'environnement d'exécution.
5. `rollback.sh` ne fait pas de migration Prisma down — si une migration est impliquée, revenir à un backup DB avant de rollbacker le code.
6. K6 exécuté uniquement contre staging, jamais contre production.

---

## Critères d'acceptation fin de phase

- `POST /api/auth/logout-all` révoque tous les tokens en base, tentative refresh → 401.
- `GET /api/auth/sessions` retourne la liste filtrée (actives uniquement, sans token brut).
- `scripts/backup.sh` transfère le `.gpg` sur SFTP, `verify-backup.sh` confirme l'intégrité.
- K6 `auth.k6.js` + `studies.k6.js` sur staging : p95 < 500ms, errors < 1%.
- `scripts/rollback.sh --tag <N-1>` exercé sur staging : service fonctionnel après rollback.
- 3 runbooks Phase 12 créés et relus.
- CI/CD verte sur main.
