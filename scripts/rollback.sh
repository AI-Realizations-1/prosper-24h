#!/usr/bin/env bash
# scripts/rollback.sh — Rollback vers un tag ou SHA Git donné
# Usage: SFTP_USER=... SFTP_HOST=... DEPLOY_TARGET_PATH=... ./scripts/rollback.sh --tag <git-tag-ou-sha>
set -euo pipefail

usage() {
  echo "Usage: ./scripts/rollback.sh --tag <git-tag-ou-sha>"
  echo "  Exemple : ./scripts/rollback.sh --tag v1.2.3"
  echo "  Exemple : ./scripts/rollback.sh --tag abc1234"
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

: "${DEPLOY_TARGET_PATH:?Variable DEPLOY_TARGET_PATH manquante}"
: "${SFTP_USER:?Variable SFTP_USER manquante}"
: "${SFTP_HOST:?Variable SFTP_HOST manquante}"

echo ""
echo "  ⚠️  ROLLBACK PROSPER vers $TAG ⚠️"
echo "  Cible SSH : ${SFTP_USER}@${SFTP_HOST}:${DEPLOY_TARGET_PATH}"
echo ""
echo "ATTENTION : Un rollback ne revient PAS en arrière sur les migrations DB."
echo "Si ce tag implique une migration destructive, restaurez d'abord un backup DB."
echo ""
read -r -p "Confirmer le rollback vers $TAG ? (yes/NON) : " CONFIRM
[ "$CONFIRM" != "yes" ] && echo "Annulé." && exit 0

# Checkout du tag
echo "[rollback] git fetch + checkout $TAG..."
git fetch --tags
git checkout "$TAG"

# Build
echo "[rollback] Build API..."
pnpm --filter @prosper/api build

echo "[rollback] Build Web..."
pnpm --filter web build

# Déploiement via rsync
echo "[rollback] Déploiement API..."
rsync -az --delete \
  apps/api/dist/ \
  "${SFTP_USER}@${SFTP_HOST}:${DEPLOY_TARGET_PATH}/api/dist/"

rsync -az \
  apps/api/package.json \
  apps/api/prisma/ \
  "${SFTP_USER}@${SFTP_HOST}:${DEPLOY_TARGET_PATH}/api/"

echo "[rollback] Déploiement Web..."
rsync -az --delete \
  apps/web/dist/ \
  "${SFTP_USER}@${SFTP_HOST}:${DEPLOY_TARGET_PATH}/web/dist/"

# Redémarrage PM2
echo "[rollback] Redémarrage PM2..."
ssh "${SFTP_USER}@${SFTP_HOST}" \
  "cd ${DEPLOY_TARGET_PATH}/api && npm install --omit=dev --silent && pm2 restart prosper-api"

echo ""
echo "[rollback] Rollback vers $TAG terminé."
echo "Vérifier : curl https://<host>/api/health"
