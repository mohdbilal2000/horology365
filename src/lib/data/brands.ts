import { cache } from "react";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { brands as seedBrands } from "@/lib/mock/brands";
import type { Brand } from "@/lib/types";

interface BrandRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  logo_url: string;
  cover_url: string;
  is_active: boolean;
  sort_order: number;
}

function rowToBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    logoUrl: row.logo_url,
    coverUrl: row.cover_url,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

/**
 * Brands the store no longer carries. Forced inactive here — not just in the
 * seed — so the delisting ships with a deploy even while the Supabase rows
 * still say is_active=true. Once the rows are flipped (or re-seeded from the
 * updated seed data), entries here become redundant and can be removed.
 */
export const DELISTED_BRAND_SLUGS = new Set([
  "armani-exchange",
  "diesel",
  "michael-kors",
  "guess",
  "lacoste",
]);

const applyDelisting = (brand: Brand): Brand =>
  DELISTED_BRAND_SLUGS.has(brand.slug) ? { ...brand, isActive: false } : brand;

export const getAllBrands = cache(async (): Promise<Brand[]> => {
  const supabase = getSupabaseAnon();
  if (!supabase) return seedBrands.map(applyDelisting);

  const { data, error } = await supabase
    .from("brands")
    .select("id, slug, name, tagline, logo_url, cover_url, is_active, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[data/brands] Supabase query failed, using seed brands:", error.message);
    return seedBrands.map(applyDelisting);
  }
  return (data as BrandRow[]).map(rowToBrand).map(applyDelisting);
});

export async function getActiveBrands(): Promise<Brand[]> {
  const all = await getAllBrands();
  return all.filter((b) => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getBrandBySlug(slug: string): Promise<Brand | undefined> {
  const all = await getAllBrands();
  return all.find((b) => b.slug === slug);
}
