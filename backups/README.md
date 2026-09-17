# Production exports

Drop a catalogue export here before a release that changes where products are
stored. Files in this folder are the owner's real stock — keep them, they are
the evidence that nothing was lost.

## Exporting from the old (pre-Blob) production build

1. Sign in at https://www.horology365.com/admin-login
2. In the same browser tab, open https://www.horology365.com/api/admin/products
3. Save the JSON as `backups/legacy-products-<YYYY-MM-DD>.json`

## Putting it back after the Blob build is deployed

```bash
npx tsx scripts/import-legacy-products.ts backups/legacy-products-<date>.json
# review the printed list, then:
BLOB_READ_WRITE_TOKEN=... npx tsx scripts/import-legacy-products.ts backups/legacy-products-<date>.json --write
```

Insert-only: a product whose slug is already in the catalogue is left exactly
as it is. Running it twice adds nothing the second time.

Do not put order exports here — they carry customer names, addresses and
phone numbers.
