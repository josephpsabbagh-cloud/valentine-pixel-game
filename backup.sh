#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP="$(date +"%Y-%m-%d_%H%M%S")"
ARCHIVE_PATH="$BACKUP_DIR/${PROJECT_NAME}_${TIMESTAMP}.zip"

mkdir -p "$BACKUP_DIR"

cd "$PROJECT_DIR"

zip -r "$ARCHIVE_PATH" . \
  -x "./.git/*" \
  -x "./node_modules/*" \
  -x "./backups/*" \
  -x "./.DS_Store" \
  -x "*/__pycache__/*" \
  -x "*.pyc" \
  >/dev/null

echo "Backup created: $ARCHIVE_PATH"
