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
 * Brands the store didn't carry at launch. This is the DEFAULT for the seed
 * catalogue only — it is NOT applied to rows coming from Supabase, because
 * the admin's brand controls write is_active there and an override here would
 * silently ignore them (hide a brand the admin had just switched on, with no
 * explanation). The database is the source of truth whenever there is one.
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

/**
 * G-Shock sells as its own storefront brand (its own tile, bay and page),
 * split out of Casio. The Supabase brands table may predate that split, so
 * the seed entry is appended whenever the DB has no g-shock row — once the
 * row exists (or after a re-seed), this shim is a no-op.
 */
function ensureGShock(brands: Brand[]): Brand[] {
  if (brands.some((b) => b.slug === "g-shock")) return brands;
  const seed = seedBrands.find((b) => b.slug === "g-shock");
  return seed ? [...brands, seed] : brands;
}

export const getAllBrands = cache(async (): Promise<Brand[]> => {
  const supabase = getSupabaseAnon();
  if (!supabase) return ensureGShock(seedBrands.map(applyDelisting));

  const { data, error } = await supabase
    .from("brands")
    .select("id, slug, name, tagline, logo_url, cover_url, is_active, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[data/brands] Supabase query failed, using seed brands:", error.message);
    return ensureGShock(seedBrands.map(applyDelisting));
  }
  // No applyDelisting here: these rows are what the admin controls.
  return ensureGShock((data as BrandRow[]).map(rowToBrand));
});

export async function getActiveBrands(): Promise<Brand[]> {
  const all = await getAllBrands();
  return all.filter((b) => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getBrandBySlug(slug: string): Promise<Brand | undefined> {
  const all = await getAllBrands();
  return all.find((b) => b.slug === slug);
}
