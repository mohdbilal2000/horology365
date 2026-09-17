/**
 * Loads a catalogue exported from the OLD (pre-Blob) production build into
 * Blob storage, insert-only.
 *
 *   npx tsx scripts/import-legacy-products.ts backups/<file>.json          # plan only
 *   BLOB_READ_WRITE_TOKEN=... npx tsx scripts/import-legacy-products.ts <file> --write
 *
 * Why this exists: production ran a Postgres-backed build for weeks while the
 * repo moved to Blob. The owner's products live in that old store, so the
 * first Blob deploy would show a shop that is missing them. Exporting from the
 * old admin (GET /api/admin/products) and running this puts them back.
 *
 * It goes through restoreCatalogueEntries like every other restore, so it is
 * INSERT-ONLY: a slug that already exists is left exactly as it is, never
 * overwritten. Without --write nothing is sent anywhere — it prints what it
 * would add and stops.
 */
import { readFileSync } from "node:fs";
import { computeDerivedFields } from "../src/lib/data/adminProducts";
import { normaliseIncomingProduct } from "../src/lib/data/backup";
import { restoreCatalogueEntries } from "../src/lib/data/catalogue";
import type { Variant } from "../src/lib/types";

/** The old admin API answered with camelCase models; storage speaks snake_case. */
interface LegacyModel {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  brandSlug?: string;
  brand_slug?: string;
  categorySlug?: string;
  category_slug?: string;
  price?: number;
  mrp?: number;
  imageUrl?: string;
  images?: unknown[];
  variants?: Variant[];
  createdAt?: string;
  created_at?: string;
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Keeps the product's original slug wherever the export carries one: it is the
 * public URL customers and Google already have, and it is what makes the
 * insert-only guard recognise a product that is already there.
 */
function toRow(m: LegacyModel): Record<string, unknown> {
  const variants = Array.isArray(m.variants) ? m.variants : [];
  const { stock, isPreorder, dropDate } = computeDerivedFields(variants);
  const images = m.images?.length ? m.images : m.imageUrl ? [m.imageUrl] : [];
  return {
    id: m.id,
    slug: m.slug || slugify(String(m.title ?? "")),
    title: m.title ?? "",
    description: m.description ?? "",
    brand_slug: m.brandSlug ?? m.brand_slug ?? "",
    category_slug: m.categorySlug ?? m.category_slug ?? "mens-watches",
    price: m.price ?? 0,
    mrp: m.mrp ?? 0,
    images,
    stock,
    is_preorder: isPreorder,
    drop_date: dropDate,
    variants,
    created_at: m.createdAt ?? m.created_at,
  };
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  const write = flags.includes("--write");
  if (!file) {
    console.error("Usage: npx tsx scripts/import-legacy-products.ts <export.json> [--write]");
    process.exit(1);
  }

  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  const models: LegacyModel[] = Array.isArray(parsed)
    ? parsed
    : ((parsed as { models?: LegacyModel[]; products?: LegacyModel[] }).models ??
       (parsed as { products?: LegacyModel[] }).products ??
       []);

  if (models.length === 0) {
    console.error(`No products found in ${file}. Expected an array, or {"models": [...]}.`);
    process.exit(1);
  }

  const rows = models.map(toRow);
  console.log(`${rows.length} product(s) in ${file}:`);
  for (const r of rows) console.log(`  · ${r.brand_slug} ${r.title} — ${r.slug} (${r.stock} in stock)`);

  if (!write) {
    console.log("\nPlan only. Nothing was written. Re-run with --write to insert.");
    return;
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("\nBLOB_READ_WRITE_TOKEN is not set — refusing to run --write.");
    process.exit(1);
  }

  const entries = await Promise.all(rows.map((r) => normaliseIncomingProduct(r)));
  const { restored, skipped } = await restoreCatalogueEntries(entries);
  console.log(
    `\nDone. ${restored} added, ${skipped} already present and left untouched ` +
      `(existing products are never overwritten).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
