#!/usr/bin/env bash
# scripts/verify-backup.sh — Vérifie l'intégrité du dernier backup GPG hors-site
# Usage: BACKUP_DESTINATION=sftp SFTP_USER=... SFTP_HOST=... SFTP_TARGET_PATH=... ./scripts/verify-backup.sh
set -euo pipefail

VERIFY_DIR=$(mktemp -d)
trap 'rm -rf "$VERIFY_DIR"' EXIT

BACKUP_DESTINATION="${BACKUP_DESTINATION:-sftp}"

echo "[verify] Récupération du dernier backup ($BACKUP_DESTINATION)..."

if [ "$BACKUP_DESTINATION" = "s3" ]; then
  : "${BACKUP_S3_BUCKET:?La variable BACKUP_S3_BUCKET est requise}"
  LATEST=$(aws s3 ls "s3://${BACKUP_S3_BUCKET}/prosper/" | sort | tail -1 | awk '{print $4}')
  [ -z "$LATEST" ] && echo "[verify] ERREUR : aucun backup trouvé sur S3" && exit 1
  aws s3 cp "s3://${BACKUP_S3_BUCKET}/prosper/${LATEST}" "${VERIFY_DIR}/${LATEST}"
  BACKUP_FILE="${VERIFY_DIR}/${LATEST}"
else
  : "${SFTP_HOST:?La variable SFTP_HOST est requise}"
  : "${SFTP_USER:?La variable SFTP_USER est requise}"
  : "${SFTP_TARGET_PATH:?La variable SFTP_TARGET_PATH est requise}"
  LATEST=$(ssh "${SFTP_USER}@${SFTP_HOST}" "ls -t ${SFTP_TARGET_PATH}/*.gpg 2>/dev/null | head -1")
  [ -z "$LATEST" ] && echo "[verify] ERREUR : aucun backup trouvé sur SFTP" && exit 1
  scp "${SFTP_USER}@${SFTP_HOST}:${LATEST}" "${VERIFY_DIR}/latest.sql.gpg"
  BACKUP_FILE="${VERIFY_DIR}/latest.sql.gpg"
fi

echo "[verify] Déchiffrement GPG..."
gpg --batch --yes --decrypt --output "${VERIFY_DIR}/verify.sql" "$BACKUP_FILE" 2>/dev/null

SIZE=$(wc -c < "${VERIFY_DIR}/verify.sql")
[ "$SIZE" -lt 100 ] && echo "[verify] ERREUR : dump déchiffré trop petit (${SIZE} octets)" && exit 1

echo "[verify] OK — dump intègre, ${SIZE} octets déchiffrés."
