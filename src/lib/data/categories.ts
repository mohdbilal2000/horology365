import { cache } from "react";
import { categories as seedCategories } from "@/lib/mock/categories";
import type { Category } from "@/lib/types";

/**
 * Categories are code-managed configuration, not the owner's content — no
 * admin editor exists for them, so they ship with the site rather than
 * living in a store (see DATA_SAFETY.md).
 */

export const getAllCategories = cache(async (): Promise<Category[]> => {
  return seedCategories;
});

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const all = await getAllCategories();
  return all.find((c) => c.slug === slug);
}
