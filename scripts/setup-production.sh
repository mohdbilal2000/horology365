#!/usr/bin/env bash
# One command to make a fresh production database ready to serve the shop.
#
#   npm run setup:prod -- "postgres://user:pass@host/db"
#
# Creates the tables, installs the six protections, loads the starter
# catalogue, and prints exactly what to paste into Vercel. Safe to re-run:
# nothing here drops, empties or overwrites anything.
set -euo pipefail

URL="${1:-${DATABASE_URL:-${POSTGRES_URL:-}}}"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
fail() { printf '\033[31m%s\033[0m\n' "$1" >&2; exit 1; }

if [ -z "$URL" ]; then
  cat <<'USAGE'
Paste your database connection string after the command:

  npm run setup:prod -- "postgres://user:pass@host/dbname"

Get one from Vercel (Storage → Create Database → Postgres) or Neon.
On Neon, copy the POOLED string — the host with "-pooler" in it.
USAGE
  exit 1
fi

command -v psql >/dev/null || fail "psql not found. On a Mac:  brew install postgresql@16"

# Serverless holds one pool per warm instance, so a direct connection runs the
# database out of connections under load. Worth a word, not worth blocking on.
case "$URL" in
  *-pooler*|*:6543*|*pgbouncer*) ;;
  *) printf '\033[33m%s\033[0m\n' \
       "Note: this looks like a direct (non-pooled) connection string. It will
work, but for production prefer the pooled one — Neon's \"-pooler\" host or
Supabase's port 6543 — or the site can exhaust connections under load." ;;
esac

echo
bold "1/3  Creating tables and installing the protections…"
DATABASE_URL="$URL" bash scripts/db-setup.sh

INSTALLED="$(psql "$URL" -tAq -c "
  select count(*) from pg_trigger
   where tgname in ('products_no_hard_delete','products_no_truncate',
                    'orders_no_hard_delete','orders_no_truncate',
                    'admin_audit_append_only','admin_audit_no_truncate');")"
[ "$INSTALLED" = "6" ] || fail "Only $INSTALLED of 6 protections installed — stopping. Do not go live until this reads 6."

echo
bold "2/3  Loading the starter catalogue (insert-only — never overwrites)…"
DATABASE_URL="$URL" npx tsx scripts/seed-db.ts

echo
bold "3/3  Paste these into Vercel → horology365 → Settings → Environment Variables"
echo "     (select Production, then redeploy: Deployments → latest → Redeploy)"
echo
echo "  DATABASE_URL   = the same connection string you just used"
echo "  APP_SECRET     = $(openssl rand -hex 32)"
echo
echo "APP_SECRET is generated fresh above. Without it customers cannot receive"
echo "or download their invoice. Keep it secret; changing it later invalidates"
echo "invoice links already sent."
echo
echo "Optional, for emailed invoices and WhatsApp delivery:"
echo "  RESEND_API_KEY, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID"
echo
echo "After the redeploy, check it took:"
echo "  npm run health"
