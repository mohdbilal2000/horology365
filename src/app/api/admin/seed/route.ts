import { NextResponse } from "next/server";
import { query, isDatabaseConfigured } from "@/lib/db/client";
import { categoryRows, brandRows, productRows } from "@/lib/seedCatalog";
import { revalidateCatalog } from "@/lib/revalidateCatalog";

/**
 * Admin-gated equivalent of `npm run seed` — loads the static catalogue
 * (categories/brands/products) into a deployed environment without needing the
 * database password on a laptop.
 *
 * Safe to call any number of times: categories and brands are code-managed
 * config and are refreshed, but PRODUCTS ARE ONLY EVER INSERTED. An existing
 * product is never rewritten, so seeding cannot undo the owner's edits or
 * replace images he uploaded. This used to upsert products, which is how his
 * products and photos were lost. Do not change it back.
 *
 * Each table is written in ONE statement. The first version issued a query per
 * row — 62 sequential round-trips — and against a managed database a region
 * away that ran past the function's time limit and died midway, leaving 16 of
 * 45 products in place and the shop looking half-built. Batched, it is three
 * round-trips and finishes in well under a second.
 */
export const maxDuration = 60;

/** `($1,$2,$3), ($4,$5,$6), …` for `rows` rows of `width` columns. */
function placeholders(rows: number, width: number): string {
  return Array.from({ length: rows }, (_, r) =>
    `(${Array.from({ length: width }, (_, c) => `$${r * width + c + 1}`).join(",")})`,
  ).join(",");
}

export async function POST(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "The database isn't configured (DATABASE_URL missing)." },
      { status: 503 },
    );
  }

  const categories = categoryRows();
  const brands = brandRows();
  const products = productRows();

  try {
    if (categories.length) {
      await query(
        `insert into categories (slug, name, description, image_url)
         values ${placeholders(categories.length, 4)}
         on conflict (slug) do update
           set name = excluded.name,
               description = excluded.description,
               image_url = excluded.image_url`,
        categories.flatMap((c) => [c.slug, c.name, c.description, c.image_url]),
      );
    }

    if (brands.length) {
      await query(
        `insert into brands (slug, name, tagline, logo_url, cover_url, is_active, sort_order)
         values ${placeholders(brands.length, 7)}
         on conflict (slug) do update
           set name = excluded.name,
               tagline = excluded.tagline,
               logo_url = excluded.logo_url,
               cover_url = excluded.cover_url,
               is_active = excluded.is_active,
               sort_order = excluded.sort_order`,
        brands.flatMap((b) => [
          b.slug, b.name, b.tagline, b.logo_url, b.cover_url, b.is_active, b.sort_order,
        ]),
      );
    }

    let inserted = 0;
    if (products.length) {
      // DO NOTHING, never DO UPDATE — this is the line that protects the
      // owner's edited products and uploaded photos.
      const rows = await query<{ slug: string }>(
        `insert into products
           (slug, title, description, brand_slug, category_slug, price, mrp,
            images, video_url, video_poster, rating, review_count, stock,
            is_preorder, drop_date, is_featured, tags, variants)
         values ${placeholders(products.length, 18)}
         on conflict (slug) do nothing
         returning slug`,
        products.flatMap((p) => [
          p.slug, p.title, p.description, p.brand_slug, p.category_slug,
          p.price, p.mrp, JSON.stringify(p.images), p.video_url, p.video_poster,
          p.rating, p.review_count, p.stock, p.is_preorder, p.drop_date,
          p.is_featured, p.tags, JSON.stringify(p.variants),
        ]),
      );
      inserted = rows.length;
    }

    revalidateCatalog();
    return NextResponse.json({
      ok: true,
      seeded: {
        categories: categories.length,
        brands: brands.length,
        productsInserted: inserted,
        productsSkipped: products.length - inserted,
      },
    });
  } catch (err) {
    console.error("[admin/seed] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Seed failed." },
      { status: 500 },
    );
  }
}
