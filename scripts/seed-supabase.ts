/**
 * One-time (idempotent) seed: copies the static seed catalogue
 * (src/lib/mock/*) into Supabase so the storefront has data to show right
 * after cutover. Safe to re-run — every insert upserts on `slug`.
 *
 * Usage: fill in .env.local with the Supabase vars from .env.example, then:
 *   npm run seed
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { categoryRows, brandRows, productRows } from "../src/lib/seedCatalog";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment.\n" +
      "Copy .env.example to .env.local, fill in your Supabase project's values, and re-run.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function seed() {
  const categories = categoryRows();
  const brands = brandRows();
  const products = productRows();

  console.log(`Seeding ${categories.length} categories…`);
  const { error: catError } = await supabase
    .from("categories")
    .upsert(categories, { onConflict: "slug" });
  if (catError) throw catError;

  console.log(`Seeding ${brands.length} brands…`);
  const { error: brandError } = await supabase
    .from("brands")
    .upsert(brands, { onConflict: "slug" });
  if (brandError) throw brandError;

  console.log(`Seeding ${products.length} products…`);
  const { error: productError } = await supabase
    // INSERT-ONLY: `ignoreDuplicates` adds products whose slug isn't present
    // and leaves existing rows untouched. This used to upsert, which rewrote
    // live products with the code's mock data and destroyed the owner's edits
    // and uploaded photos. Do not change it back.
    .from("products")
    .upsert(products, { onConflict: "slug", ignoreDuplicates: true });
  if (productError) throw productError;

  console.log("Done. The storefront now reads from Supabase.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
