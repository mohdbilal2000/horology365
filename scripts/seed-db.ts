/**
 * Loads the static catalogue into Postgres.
 *
 *   DATABASE_URL=postgres://... npm run seed
 *
 * Categories and brands are code-managed config and get refreshed. PRODUCTS ARE
 * ONLY EVER INSERTED — an existing product is never rewritten, so running this
 * against a live shop cannot undo the owner's edits or replace photos he
 * uploaded. It used to upsert them, which is exactly how his work was lost.
 */
import { categoryRows, brandRows, productRows } from "../src/lib/seedCatalog";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env.local or pass it inline.");
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "disable" || isLocal
    ? false
    : { rejectUnauthorized: false },
});

async function main() {
  const categories = categoryRows();
  const brands = brandRows();
  const products = productRows();

  console.log(`Seeding ${categories.length} categories…`);
  for (const c of categories) {
    await pool.query(
      `insert into categories (slug, name, description, image_url)
       values ($1,$2,$3,$4)
       on conflict (slug) do update
         set name = excluded.name,
             description = excluded.description,
             image_url = excluded.image_url`,
      [c.slug, c.name, c.description, c.image_url],
    );
  }

  console.log(`Seeding ${brands.length} brands…`);
  for (const b of brands) {
    await pool.query(
      `insert into brands (slug, name, tagline, logo_url, cover_url, is_active, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (slug) do update
         set name = excluded.name,
             tagline = excluded.tagline,
             logo_url = excluded.logo_url,
             cover_url = excluded.cover_url,
             is_active = excluded.is_active,
             sort_order = excluded.sort_order`,
      [b.slug, b.name, b.tagline, b.logo_url, b.cover_url, b.is_active, b.sort_order],
    );
  }

  console.log(`Seeding ${products.length} products (insert-only)…`);
  let inserted = 0;
  for (const p of products) {
    const { rowCount } = await pool.query(
      `insert into products
         (slug, title, description, brand_slug, category_slug, price, mrp,
          images, video_url, video_poster, rating, review_count, stock,
          is_preorder, drop_date, is_featured, tags, variants)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       on conflict (slug) do nothing`,
      [
        p.slug, p.title, p.description, p.brand_slug, p.category_slug,
        p.price, p.mrp, JSON.stringify(p.images), p.video_url, p.video_poster,
        p.rating, p.review_count, p.stock, p.is_preorder, p.drop_date,
        p.is_featured, p.tags, JSON.stringify(p.variants),
      ],
    );
    inserted += rowCount ?? 0;
  }

  console.log(
    `Done. ${inserted} product(s) added, ${products.length - inserted} left untouched ` +
      `(already present — existing rows are never overwritten).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
