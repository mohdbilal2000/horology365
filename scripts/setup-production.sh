#!/usr/bin/env bash
# One command to make a fresh Vercel project ready to serve the shop.
#
#   npm run setup:prod -- "vercel_blob_rw_..."
#
# Loads the starter catalogue (insert-only — never overwrites) and prints
# exactly what to paste into Vercel. There is no schema to create: product
# storage is Vercel Blob, not a database, so there's nothing to set up beyond
# the token itself.
set -euo pipefail

TOKEN="${1:-${BLOB_READ_WRITE_TOKEN:-}}"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
fail() { printf '\033[31m%s\033[0m\n' "$1" >&2; exit 1; }

if [ -z "$TOKEN" ]; then
  cat <<'USAGE'
Paste your Blob read-write token after the command:

  npm run setup:prod -- "vercel_blob_rw_..."

Get one from Vercel: Storage → Create Database → Blob → then
Settings → copy the BLOB_READ_WRITE_TOKEN it generates.
USAGE
  exit 1
fi

echo
bold "1/2  Loading the starter catalogue (insert-only — never overwrites)…"
BLOB_READ_WRITE_TOKEN="$TOKEN" npx tsx scripts/seed-db.ts

echo
bold "2/2  Paste these into Vercel → horology365 → Settings → Environment Variables"
echo "     (select Production, then redeploy: Deployments → latest → Redeploy)"
echo
echo "  BLOB_READ_WRITE_TOKEN = the same token you just used"
echo "  APP_SECRET            = $(openssl rand -hex 32)"
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
