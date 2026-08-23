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
 */
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
    for (const c of categories) {
      await query(
        `insert into categories (slug, name, description, image_url)
         values ($1, $2, $3, $4)
         on conflict (slug) do update
           set name = excluded.name,
               description = excluded.description,
               image_url = excluded.image_url`,
        [c.slug, c.name, c.description, c.image_url],
      );
    }

    for (const b of brands) {
      await query(
        `insert into brands (slug, name, tagline, logo_url, cover_url, is_active, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7)
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

    let inserted = 0;
    for (const p of products) {
      // DO NOTHING, never DO UPDATE — this is the line that protects the
      // owner's edited products and uploaded photos.
      const rows = await query(
        `insert into products
           (slug, title, description, brand_slug, category_slug, price, mrp,
            images, video_url, video_poster, rating, review_count, stock,
            is_preorder, drop_date, is_featured, tags, variants)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         on conflict (slug) do nothing
         returning slug`,
        [
          p.slug, p.title, p.description, p.brand_slug, p.category_slug,
          p.price, p.mrp, JSON.stringify(p.images), p.video_url, p.video_poster,
          p.rating, p.review_count, p.stock, p.is_preorder, p.drop_date,
          p.is_featured, p.tags, JSON.stringify(p.variants),
        ],
      );
      inserted += rows.length;
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Seed failed." },
      { status: 500 },
    );
  }
}
