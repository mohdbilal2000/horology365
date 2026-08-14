import { cache } from "react";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { categories as seedCategories } from "@/lib/mock/categories";
import type { Category, CategorySlug } from "@/lib/types";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string;
}

function rowToCategory(row: CategoryRow): Category {
  // Category imagery has no admin editor — it only ever comes from a code
  // deploy — so a Supabase row can only be stale, never intentionally
  // different. Always show the current code's image rather than whatever
  // was last synced into the database, so an image swap ships with the
  // deploy instead of needing a manual "re-sync catalogue" click.
  const seedImage = seedCategories.find((c) => c.slug === row.slug)?.imageUrl;
  return {
    id: row.id,
    slug: row.slug as CategorySlug,
    name: row.name,
    description: row.description,
    imageUrl: seedImage ?? row.image_url,
  };
}

export const getAllCategories = cache(async (): Promise<Category[]> => {
  const supabase = getSupabaseAnon();
  if (!supabase) return seedCategories;

  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, image_url");

  if (error) {
    console.error("[data/categories] Supabase query failed, using seed categories:", error.message);
    return seedCategories;
  }
  return (data as CategoryRow[]).map(rowToCategory);
});

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const all = await getAllCategories();
  return all.find((c) => c.slug === slug);
}
