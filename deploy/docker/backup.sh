#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ENV_FILE=${OA_DOCKER_ENV_FILE:-"$SCRIPT_DIR/.env"}

read_env_value() {
  local key=$1
  awk -v key="$key" 'index($0, key "=") == 1 { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE"
}

require_absolute_path() {
  local name=$1
  local value=$2
  case "$value" in
    /*) ;;
    *)
      echo "$name must be an absolute path." >&2
      exit 1
      ;;
  esac
}

test -r "$ENV_FILE"
DATA_DIR=${OA_DATA_DIR:-$(read_env_value OA_DATA_DIR)}
BACKUP_DIR=${OA_BACKUP_DIR:-$(read_env_value OA_BACKUP_DIR)}
RETENTION_DAYS=${OA_BACKUP_RETENTION_DAYS:-$(read_env_value OA_BACKUP_RETENTION_DAYS)}
RETENTION_DAYS=${RETENTION_DAYS:-30}

require_absolute_path OA_DATA_DIR "$DATA_DIR"
require_absolute_path OA_BACKUP_DIR "$BACKUP_DIR"
case "$RETENTION_DAYS" in
  *[!0-9]* | '')
    echo 'OA_BACKUP_RETENTION_DAYS must be a non-negative integer.' >&2
    exit 1
    ;;
esac

for required_command in flock gzip sqlite3; do
  if ! command -v "$required_command" >/dev/null; then
    echo "Required backup command is missing: $required_command" >&2
    exit 1
  fi
done
test -s "$DATA_DIR/oa.sqlite"
install -d -m 700 "$BACKUP_DIR"

SCHEMA_MARKERS=$(sqlite3 "$DATA_DIR/oa.sqlite" \
  "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name IN ('migrations', 'users');")
if [ "$SCHEMA_MARKERS" != "2" ]; then
  echo 'Source database is not an initialized OA database.' >&2
  exit 1
fi

exec 9>"$BACKUP_DIR/.backup.lock"
if ! flock -n 9; then
  echo 'Another SQLite backup is already running.' >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)-$$"
TEMP_DIR=$(mktemp -d "$BACKUP_DIR/.backup-$STAMP.XXXXXX")
TEMP_DB="$TEMP_DIR/oa.sqlite"
FINAL_BACKUP="$BACKUP_DIR/oa-$STAMP.sqlite.gz"
cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

sqlite3 "$DATA_DIR/oa.sqlite" \
  ".timeout 10000" \
  ".backup '$TEMP_DB'"

INTEGRITY=$(sqlite3 "$TEMP_DB" 'PRAGMA integrity_check;')
if [ "$INTEGRITY" != "ok" ]; then
  echo "SQLite backup integrity check failed: $INTEGRITY" >&2
  exit 1
fi

gzip -9 "$TEMP_DB"
mv "$TEMP_DB.gz" "$FINAL_BACKUP"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'oa-*.sqlite.gz' -mtime "+$RETENTION_DAYS" -delete
printf '%s\n' "$FINAL_BACKUP"
