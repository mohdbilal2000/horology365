#!/usr/bin/env bash
# Starts a throwaway PostgreSQL, applies the schema, runs the integration tests,
# and tears everything down. Used by `npm run test:db` and by CI (where a
# Postgres service container is provided instead, via TEST_DATABASE_URL).
set -euo pipefail

if [ -n "${TEST_DATABASE_URL:-}" ]; then
  echo "Using the provided TEST_DATABASE_URL."
else
  export PATH="$PATH:/usr/lib/postgresql/16/bin:/usr/lib/postgresql/15/bin"
  command -v initdb >/dev/null || { echo "PostgreSQL not installed; skipping."; exit 0; }

  # Pick a free port rather than a fixed one: a stale server from an earlier run
  # would otherwise fail the whole verify gate for an environmental reason,
  # which reads as a code failure and wastes the next person's time.
  PGPORT="$(python3 -c "import socket; s=socket.socket(); s.bind(('127.0.0.1',0)); print(s.getsockname()[1]); s.close()")"
  PGROOT="$(mktemp -d /var/tmp/h365pg.XXXXXX)"
  trap 'pg_ctl -D "$PGROOT/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$PGROOT"' EXIT

  # initdb refuses to run as root, so use the postgres account when we are root.
  if [ "$(id -u)" = "0" ]; then
    chown -R postgres "$PGROOT"
    RUN="su postgres -c"
  else
    RUN="bash -c"
  fi

  $RUN "PATH=\$PATH:/usr/lib/postgresql/16/bin initdb -D $PGROOT/data -A trust" >/dev/null
  $RUN "PATH=\$PATH:/usr/lib/postgresql/16/bin pg_ctl -D $PGROOT/data -o '-p $PGPORT -k $PGROOT' -l $PGROOT/log start" >/dev/null

  until psql -h "$PGROOT" -p "$PGPORT" -U postgres -c 'select 1' >/dev/null 2>&1; do sleep 0.3; done
  psql -h "$PGROOT" -p "$PGPORT" -U postgres -qc 'create database h365test;'

  export TEST_DATABASE_URL="postgresql://postgres@localhost:$PGPORT/h365test?host=$PGROOT"
  PSQL_ARGS=(-h "$PGROOT" -p "$PGPORT" -U postgres -d h365test -q -v ON_ERROR_STOP=1)
  psql "${PSQL_ARGS[@]}" -f db/schema.sql
  psql "${PSQL_ARGS[@]}" -f db/migrations/20260823-product-data-safety.sql
  echo "Test database ready."
fi

npx tsx --tsconfig tsconfig.test.json --test tests/db-integration.test.ts
