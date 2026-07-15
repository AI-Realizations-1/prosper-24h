#!/usr/bin/env bash
# scripts/purge-expired-tokens.sh — Purge des refresh tokens expirés en base
# Usage: DATABASE_URL=... ./scripts/purge-expired-tokens.sh
# Exemple crontab : 0 3 * * * DATABASE_URL="postgresql://..." /path/to/scripts/purge-expired-tokens.sh >> /var/log/prosper-purge.log 2>&1
set -euo pipefail

: "${DATABASE_URL:?La variable DATABASE_URL est requise}"

DELETED=$(psql "$DATABASE_URL" -t -c \
  "DELETE FROM refresh_tokens WHERE expires_at < NOW(); SELECT ROW_COUNT();" \
  2>/dev/null | tr -d ' \n')

echo "$(date '+%Y-%m-%d %H:%M:%S') — Purge tokens expirés : ${DELETED:-0} ligne(s) supprimée(s)"
