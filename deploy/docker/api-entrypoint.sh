#!/bin/sh
set -eu

database_path=${OA_DATABASE_PATH:-/app/data/oa.sqlite}
database_directory=$(dirname "$database_path")
jwt_secret=${JWT_SECRET:-}
demo_seed=$(printf '%s' "${OA_DEMO_SEED:-false}" | tr '[:upper:]' '[:lower:]')
node_environment=$(printf '%s' "${NODE_ENV:-production}" | tr '[:upper:]' '[:lower:]')

case "$node_environment" in
  production | development | test)
    export NODE_ENV=$node_environment
    ;;
  *)
    echo 'NODE_ENV must be production, development, or test.' >&2
    exit 1
    ;;
esac

if [ "$NODE_ENV" = "production" ]; then
  if [ "${#jwt_secret}" -lt 32 ]; then
    echo 'JWT_SECRET must contain at least 32 characters in production.' >&2
    exit 1
  fi
  if [ "$demo_seed" = "true" ]; then
    echo 'OA_DEMO_SEED must be false in production.' >&2
    exit 1
  fi
  if [ "$database_path" = ":memory:" ]; then
    echo 'OA_DATABASE_PATH cannot use an in-memory database in production.' >&2
    exit 1
  fi
fi

mkdir -p "$database_directory"
if [ ! -w "$database_directory" ]; then
  echo "Database directory is not writable by container UID $(id -u): $database_directory" >&2
  exit 1
fi

exec "$@"
