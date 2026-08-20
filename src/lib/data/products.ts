import { cache } from "react";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { products as seedProducts } from "@/lib/mock/products";
import { DELISTED_BRAND_SLUGS } from "@/lib/data/brands";
import type { CategorySlug, Product } from "@/lib/types";

interface ProductRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  brand_slug: string;
  category_slug: string;
  price: number;
  mrp: number;
  images: { url: string; alt: string }[];
  video_url: string | null;
  video_poster: string | null;
  rating: number;
  review_count: number;
  stock: number;
  is_preorder: boolean;
  drop_date: string | null;
  is_featured: boolean;
  tags: string[];
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    brandSlug: row.brand_slug,
    categorySlug: row.category_slug as CategorySlug,
    price: row.price,
    mrp: row.mrp,
    images: row.images ?? [],
    videoUrl: row.video_url ?? undefined,
    videoPoster: row.video_poster ?? undefined,
    rating: Number(row.rating) || 0,
    reviewCount: row.review_count,
    stock: row.stock,
    isPreorder: row.is_preorder,
    dropDate: row.drop_date ?? undefined,
    isFeatured: row.is_featured,
    tags: row.tags ?? [],
  };
}

/**
 * The full catalog, fetched once per request (React `cache()`) and filtered
 * in memory by every other helper below — mirrors how the static seed array
 * already works, and avoids an N+1 query pattern (e.g. the home page loops
 * over every brand). Falls back to the static seed catalogue only when
 * Supabase isn't configured or the query itself fails — never merely because
 * a configured query returned zero rows.
 */
/** Delisted brands' watches never reach the storefront, even if their DB rows remain. */
const sellable = (p: Product): boolean => !DELISTED_BRAND_SLUGS.has(p.brandSlug);

/**
 * G-Shock has its own storefront column: Casio products from the G-Shock /
 * Baby-G family file under the dedicated g-shock brand, even while their
 * catalogue rows still say casio. Matches by tag or title so admin-added
 * G-Shock watches land in the right place automatically.
 */
const isGShock = (p: Product): boolean =>
  p.brandSlug === "casio" &&
  (p.tags.includes("g-shock") || /g-shock|baby-g/i.test(p.title));

const fileGShock = (p: Product): Product =>
  isGShock(p) ? { ...p, brandSlug: "g-shock" } : p;

export const getAllProducts = cache(async (): Promise<Product[]> => {
  const supabase = getSupabaseAnon();
  if (!supabase) return seedProducts.filter(sellable).map(fileGShock);

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, title, description, brand_slug, category_slug, price, mrp, images, video_url, video_poster, rating, review_count, stock, is_preorder, drop_date, is_featured, tags",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[data/products] Supabase query failed, using seed catalogue:", error.message);
    return seedProducts.filter(sellable).map(fileGShock);
  }
  return (data as ProductRow[]).map(rowToProduct).filter(sellable).map(fileGShock);
});

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const all = await getAllProducts();
  return all.find((p) => p.slug === slug);
}

export async function getProductsByBrand(brandSlug: string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.brandSlug === brandSlug);
}

export async function getProductsByCategory(category: CategorySlug): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.categorySlug === category);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.isFeatured);
}

export async function getPreorderProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.isPreorder);
}

export async function getVideoProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => Boolean(p.videoUrl));
}

/** Top sellers by review volume — used for the homepage best-sellers grid. */
export async function getBestSellers(): Promise<Product[]> {
  const all = await getAllProducts();
  return [...all]
    .filter((p) => !p.isPreorder)
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 8);
}

/** Newest in — fills the category/home grids. */
export async function getNewArrivals(): Promise<Product[]> {
  const all = await getAllProducts();
  return [...all].slice(0, 12);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await getAllProducts();
  return all
    .filter((p) => p.brandSlug === product.brandSlug && p.id !== product.id)
    .slice(0, limit);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await getAllProducts();
  return all.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.brandSlug.replace(/-/g, " ").includes(q) ||
      p.tags.some((t) => t.includes(q)),
  );
}
