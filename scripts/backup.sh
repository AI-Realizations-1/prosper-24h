#!/usr/bin/env bash
# scripts/backup.sh — Sauvegarde chiffrée GPG de la base Prosper
# Usage: DATABASE_URL=... GPG_RECIPIENT=<email-ou-fingerprint> ./scripts/backup.sh
set -euo pipefail

: "${DATABASE_URL:?La variable DATABASE_URL est requise}"
: "${GPG_RECIPIENT:?La variable GPG_RECIPIENT est requise}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/prosper}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PLAIN_FILE="/tmp/prosper_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${PLAIN_FILE}.gpg"
DEST_FILE="${BACKUP_DIR}/prosper_${TIMESTAMP}.sql.gpg"

mkdir -p "$BACKUP_DIR"

echo "[backup] Dump base de données..."
pg_dump "$DATABASE_URL" > "$PLAIN_FILE"

echo "[backup] Chiffrement GPG pour : $GPG_RECIPIENT"
gpg --batch --yes --encrypt --recipient "$GPG_RECIPIENT" \
  --output "$ENCRYPTED_FILE" \
  "$PLAIN_FILE"

rm -f "$PLAIN_FILE"

# Transfert hors-site (SFTP par défaut, bascule S3 via BACKUP_DESTINATION=s3)
BACKUP_DESTINATION="${BACKUP_DESTINATION:-sftp}"

if [ "$BACKUP_DESTINATION" = "s3" ]; then
  : "${BACKUP_S3_BUCKET:?La variable BACKUP_S3_BUCKET est requise pour BACKUP_DESTINATION=s3}"
  aws s3 cp "$ENCRYPTED_FILE" "s3://${BACKUP_S3_BUCKET}/prosper/$(basename "$ENCRYPTED_FILE")"
  echo "[backup] Backup uploadé sur S3 : s3://${BACKUP_S3_BUCKET}/prosper/$(basename "$ENCRYPTED_FILE")"
elif [ "$BACKUP_DESTINATION" = "sftp" ]; then
  : "${SFTP_HOST:?La variable SFTP_HOST est requise}"
  : "${SFTP_USER:?La variable SFTP_USER est requise}"
  : "${SFTP_TARGET_PATH:?La variable SFTP_TARGET_PATH est requise}"
  scp "$ENCRYPTED_FILE" "${SFTP_USER}@${SFTP_HOST}:${SFTP_TARGET_PATH}/$(basename "$ENCRYPTED_FILE")"
  echo "[backup] Backup transféré via SFTP : ${SFTP_HOST}:${SFTP_TARGET_PATH}/$(basename "$ENCRYPTED_FILE")"
fi

mv "$ENCRYPTED_FILE" "$DEST_FILE"
echo "[backup] Copie locale : $DEST_FILE ($(du -sh "$DEST_FILE" | cut -f1))"

# Purge des backups locaux de plus de 30 jours
find "$BACKUP_DIR" -name "prosper_*.sql.gpg" -mtime +30 -delete
echo "[backup] Purge anciens backups locaux (>30j) effectuée"
