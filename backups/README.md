# Production exports

Put a catalogue export here before a release that changes where products are
stored, then run the import below.

**This repository is public, and `backups/*.json` is gitignored — keep it that
way.** A backup carries the full audit trail and every order, which means
customer names, addresses and phone numbers. Keep the file on your own machine
or in a private store; never commit it here.

## Exporting from the old (pre-Blob) production build

1. Sign in at https://www.horology365.com/admin-login
2. Go to Admin → Backup → **Download backup**
3. Save it as `backups/legacy-products-<YYYY-MM-DD>.json` (gitignored)

The backup page's own file is the right export: it carries every product with
its photo URLs, description and variants. The dashboard listing does not.

## Putting it back after the Blob build is deployed

```bash
npx tsx scripts/import-legacy-products.ts backups/legacy-products-<date>.json
# review the printed list, then:
BLOB_READ_WRITE_TOKEN=... npx tsx scripts/import-legacy-products.ts backups/legacy-products-<date>.json --write
```

Insert-only: a product whose slug is already in the catalogue is left exactly
as it is. Running it twice adds nothing the second time.

The import only ever reads the `products` array. Orders in the file are
ignored — restoring those is a separate, deliberate operation.
