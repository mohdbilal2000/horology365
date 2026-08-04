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
  return {
    id: row.id,
    slug: row.slug as CategorySlug,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
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
