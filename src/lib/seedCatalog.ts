import { categories } from "@/lib/mock/categories";
import { brands } from "@/lib/mock/brands";
import { products } from "@/lib/mock/products";

/**
 * Row-shaping for the one-time catalog seed — shared by the standalone
 * `npm run seed` script (scripts/seed-db.ts, run with a local
 * .env.local) and the admin-gated /api/admin/seed route (for re-seeding a
 * deployed environment without needing the service-role key on a laptop).
 * Pure data, no database client here — each caller writes the rows with the
 * connection it already has.
 */

export function categoryRows() {
  return categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    image_url: c.imageUrl,
  }));
}

export function brandRows() {
  return brands.map((b) => ({
    slug: b.slug,
    name: b.name,
    tagline: b.tagline,
    logo_url: b.logoUrl,
    cover_url: b.coverUrl,
    is_active: b.isActive,
    sort_order: b.sortOrder,
  }));
}

export function productRows() {
  return products.map((p) => ({
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
  }));
}
