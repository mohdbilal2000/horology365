import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Inserts a brand row if this slug hasn't been seen before, so the admin's
 * "+ Add a new brand" flow doesn't hit the products.brand_slug FK. Shared by
 * the create and edit product routes.
 */
export async function ensureBrandExists(
  supabase: SupabaseClient,
  brandSlug: string,
): Promise<void> {
  const { data } = await supabase
    .from("brands")
    .select("slug")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (data) return;

  const name = brandSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  await supabase
    .from("brands")
    .insert({ slug: brandSlug, name, is_active: true, sort_order: 999 });
}
