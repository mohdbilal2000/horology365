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

export const getAllBrands = cache(async (): Promise<Brand[]> => {
  const supabase = getSupabaseAnon();
  if (!supabase) return seedBrands;

  const { data, error } = await supabase
    .from("brands")
    .select("id, slug, name, tagline, logo_url, cover_url, is_active, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[data/brands] Supabase query failed, using seed brands:", error.message);
    return seedBrands;
  }
  return (data as BrandRow[]).map(rowToBrand);
});

export async function getActiveBrands(): Promise<Brand[]> {
  const all = await getAllBrands();
  return all.filter((b) => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getBrandBySlug(slug: string): Promise<Brand | undefined> {
  const all = await getAllBrands();
  return all.find((b) => b.slug === slug);
}
