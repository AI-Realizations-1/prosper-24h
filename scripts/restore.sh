#!/usr/bin/env bash
# scripts/restore.sh — Restauration depuis une sauvegarde chiffrée GPG
# Usage: DATABASE_URL=... ./scripts/restore.sh <fichier.sql.gpg>
set -euo pipefail

: "${DATABASE_URL:?La variable DATABASE_URL est requise}"

ENCRYPTED_FILE="${1:-}"
if [ -z "$ENCRYPTED_FILE" ]; then
  echo "Usage: DATABASE_URL=... ./scripts/restore.sh <fichier.sql.gpg>"
  exit 1
fi

if [ ! -f "$ENCRYPTED_FILE" ]; then
  echo "[restore] Fichier introuvable : $ENCRYPTED_FILE"
  exit 1
fi

PLAIN_FILE="/tmp/$(basename "${ENCRYPTED_FILE%.gpg}")"

echo ""
echo "  ⚠️  RESTAURATION BASE PROSPER ⚠️"
echo "  Fichier source : $ENCRYPTED_FILE"
echo "  Cible DB       : $DATABASE_URL"
echo "  ATTENTION : Cette opération écrase la base existante."
echo ""
read -r -p "Confirmer la restauration ? (oui/NON) : " CONFIRM

if [ "$CONFIRM" != "oui" ]; then
  echo "[restore] Annulé par l'utilisateur."
  exit 0
fi

echo "[restore] Déchiffrement GPG..."
gpg --batch --yes --decrypt --output "$PLAIN_FILE" "$ENCRYPTED_FILE"

echo "[restore] Restauration en base..."
psql "$DATABASE_URL" < "$PLAIN_FILE"

rm -f "$PLAIN_FILE"
echo "[restore] Restauration terminée avec succès."
