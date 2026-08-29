import { cache } from "react";
import { readCatalogue, entryToProduct } from "@/lib/data/catalogue";
import { CATALOGUE_SNAPSHOT } from "@/lib/data/catalogueSnapshot";
import { DELISTED_BRAND_SLUGS } from "@/lib/data/brands";
import type { CategorySlug, Product } from "@/lib/types";

/**
 * The full catalog, fetched once per request (React `cache()`) and filtered
 * in memory by every other helper below — mirrors how the static seed array
 * already worked, and avoids an N+1 query pattern (e.g. the home page loops
 * over every brand).
 *
 * Reads the live catalogue from Vercel Blob — the admin's own writes, not a
 * database. `CATALOGUE_SNAPSHOT` (the owner's real stock, shipped with the
 * site) is the fallback of last resort: used only when Blob isn't configured
 * or a read genuinely fails, never merely because the live catalogue happens
 * to be empty. It is never the built-in demo catalogue — that file is not
 * importable from here at all — so a Blob outage degrades to "yesterday's
 * real stock," never to fake products in front of real customers.
 */
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
  let products: Product[];
  try {
    const { entries } = await readCatalogue();
    products = entries.length
      ? entries.filter((e) => e.deleted_at === null).map(entryToProduct)
      : CATALOGUE_SNAPSHOT;
  } catch (err) {
    console.error("[data/products] catalogue read failed, serving the shipped snapshot:", err);
    products = CATALOGUE_SNAPSHOT;
  }
  return products.filter(sellable).map(fileGShock);
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
