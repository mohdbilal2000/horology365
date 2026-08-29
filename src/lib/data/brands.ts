import { cache } from "react";
import { brands as seedBrands } from "@/lib/mock/brands";
import type { Brand } from "@/lib/types";

/**
 * Brands are code-managed configuration, not the owner's content — no
 * admin-entered data lives here (see DATA_SAFETY.md). They ship with the
 * site rather than living in a store, the same way categories do.
 */

/**
 * Brands the store no longer carries. Forced inactive here so the delisting
 * ships with a deploy.
 */
export const DELISTED_BRAND_SLUGS = new Set([
  "armani-exchange",
  "diesel",
  "michael-kors",
  "guess",
  "lacoste",
  "fossil",
]);

const applyDelisting = (brand: Brand): Brand =>
  DELISTED_BRAND_SLUGS.has(brand.slug) ? { ...brand, isActive: false } : brand;

export const getAllBrands = cache(async (): Promise<Brand[]> => {
  return seedBrands.map(applyDelisting);
});

export async function getActiveBrands(): Promise<Brand[]> {
  const all = await getAllBrands();
  return all.filter((b) => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getBrandBySlug(slug: string): Promise<Brand | undefined> {
  const all = await getAllBrands();
  return all.find((b) => b.slug === slug);
}
