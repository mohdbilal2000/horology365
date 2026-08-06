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
import { categories } from "../src/lib/mock/categories";
import { brands } from "../src/lib/mock/brands";
import { products } from "../src/lib/mock/products";

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
  console.log(`Seeding ${categories.length} categories…`);
  const { error: catError } = await supabase.from("categories").upsert(
    categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      image_url: c.imageUrl,
    })),
    { onConflict: "slug" },
  );
  if (catError) throw catError;

  console.log(`Seeding ${brands.length} brands…`);
  const { error: brandError } = await supabase.from("brands").upsert(
    brands.map((b) => ({
      slug: b.slug,
      name: b.name,
      tagline: b.tagline,
      logo_url: b.logoUrl,
      cover_url: b.coverUrl,
      is_active: b.isActive,
      sort_order: b.sortOrder,
    })),
    { onConflict: "slug" },
  );
  if (brandError) throw brandError;

  console.log(`Seeding ${products.length} products…`);
  const { error: productError } = await supabase.from("products").upsert(
    products.map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      brand_slug: p.brandSlug,
      category_slug: p.categorySlug,
      price: p.price,
      mrp: p.mrp,
      images: p.images,
      video_url: p.videoUrl ?? null,
      video_poster: p.videoPoster ?? null,
      rating: p.rating,
      review_count: p.reviewCount,
      stock: p.stock,
      is_preorder: p.isPreorder,
      drop_date: p.dropDate ?? null,
      is_featured: p.isFeatured,
      tags: p.tags,
      variants: [],
    })),
    { onConflict: "slug" },
  );
  if (productError) throw productError;

  console.log("Done. The storefront now reads from Supabase.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
