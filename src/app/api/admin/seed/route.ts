import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { categoryRows, brandRows, productRows } from "@/lib/seedCatalog";
import { revalidateCatalog } from "@/lib/revalidateCatalog";

/**
 * Admin-gated equivalent of `npm run seed` (scripts/seed-supabase.ts) — lets
 * the static catalogue (categories/brands/products) be (re)loaded into a
 * deployed environment's Supabase project without needing the service-role
 * key on a laptop. Same upsert-on-slug shape, so it's safe to call more than
 * once: admin-created products (different slugs) are untouched.
 */
export async function POST(): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Supabase isn't configured (SUPABASE_SERVICE_ROLE_KEY missing)." },
      { status: 503 },
    );
  }
  const supabase = getSupabaseAdmin()!;

  const categories = categoryRows();
  const brands = brandRows();
  const products = productRows();

  const { error: catError } = await supabase
    .from("categories")
    .upsert(categories, { onConflict: "slug" });
  if (catError) {
    return NextResponse.json({ error: `categories: ${catError.message}` }, { status: 500 });
  }

  const { error: brandError } = await supabase
    .from("brands")
    .upsert(brands, { onConflict: "slug" });
  if (brandError) {
    return NextResponse.json({ error: `brands: ${brandError.message}` }, { status: 500 });
  }

  const { error: productError } = await supabase
    .from("products")
    .upsert(products, { onConflict: "slug" });
  if (productError) {
    return NextResponse.json({ error: `products: ${productError.message}` }, { status: 500 });
  }

  revalidateCatalog();

  return NextResponse.json({
    ok: true,
    seeded: { categories: categories.length, brands: brands.length, products: products.length },
  });
}
