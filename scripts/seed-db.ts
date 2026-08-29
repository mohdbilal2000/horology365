/**
 * Loads the static starter catalogue into Blob storage.
 *
 *   BLOB_READ_WRITE_TOKEN=... npm run seed
 *
 * Categories and brands need no seeding — they're code-managed config read
 * straight from src/lib/mock/ (see DATA_SAFETY.md), not stored data.
 * PRODUCTS ARE ONLY EVER INSERTED — an existing product is never rewritten,
 * so running this against a live shop cannot undo the owner's edits or
 * replace photos he uploaded.
 */
import { productRows } from "../src/lib/seedCatalog";
import { restoreCatalogueEntries } from "../src/lib/data/catalogue";
import { normaliseIncomingProduct } from "../src/lib/data/backup";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local or pass it inline.");
  process.exit(1);
}

async function main() {
  const rows = productRows();
  console.log(`Seeding ${rows.length} product(s) (insert-only)…`);
  const entries = await Promise.all(rows.map((r) => normaliseIncomingProduct(r)));
  const { restored, skipped } = await restoreCatalogueEntries(entries);
  console.log(
    `Done. ${restored} product(s) added, ${skipped} left untouched ` +
      `(already present — existing products are never overwritten).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
