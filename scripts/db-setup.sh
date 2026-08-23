#!/usr/bin/env bash
# Creates every table and installs the protections that stop data being lost.
# Safe to re-run: nothing here drops or empties anything.
#
#   DATABASE_URL='postgres://...' npm run db:setup
set -euo pipefail

URL="${DATABASE_URL:-${POSTGRES_URL:-}}"
if [ -z "$URL" ]; then
  echo "Set DATABASE_URL first, e.g."
  echo "  DATABASE_URL='postgres://...' npm run db:setup"
  exit 1
fi

command -v psql >/dev/null || {
  echo "psql not found. On a Mac:  brew install postgresql@16"
  exit 1
}

# "already exists, skipping" NOTICEs are this script working as intended, but
# they read like faults. Errors and warnings still come through.
export PGOPTIONS='-c client_min_messages=warning'

echo "→ Creating tables…"
psql "$URL" -v ON_ERROR_STOP=1 -q -f db/schema.sql

echo "→ Installing the data-loss protections…"
psql "$URL" -v ON_ERROR_STOP=1 -q -f db/migrations/20260823-product-data-safety.sql

echo "→ Checking…"
psql "$URL" -tAq -c "
  select
    'deleted_at column: ' ||
    case when exists (select 1 from information_schema.columns
                      where table_name='products' and column_name='deleted_at')
         then 'yes' else 'MISSING' end
  union all
  select 'protection triggers: ' || count(*) || ' of 6'
    from pg_trigger
   where tgname in ('products_no_hard_delete','products_no_truncate',
                    'orders_no_hard_delete','orders_no_truncate',
                    'admin_audit_append_only','admin_audit_no_truncate');"

echo
echo "Done. Next:  npm run seed    (loads the 45 watches; never overwrites anything)"
