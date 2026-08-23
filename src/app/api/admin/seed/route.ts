import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { categoryRows, brandRows, productRows } from "@/lib/seedCatalog";
import { revalidateCatalog } from "@/lib/revalidateCatalog";

/**
 * Admin-gated equivalent of `npm run seed` (scripts/seed-supabase.ts) — lets
 * the static catalogue (categories/brands/products) be (re)loaded into a
 * deployed environment's Supabase project without needing the service-role
 * key on a laptop.
 *
 * Safe to call any number of times: categories and brands are code-managed
 * config and are refreshed, but PRODUCTS ARE ONLY EVER INSERTED. An existing
 * product is never rewritten, so seeding cannot undo the owner's edits or
 * replace images he uploaded.
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

  // Products are INSERT-ONLY. `ignoreDuplicates` makes this add rows whose slug
  // isn't present yet and leave every existing row completely untouched.
  //
  // It used to upsert, which meant re-seeding wrote the code's mock data over
  // the live rows — reverting any product the owner had edited, including
  // photos he had uploaded himself. That is how his products were lost. Do not
  // change this back to an overwriting upsert.
  const { error: productError } = await supabase
    .from("products")
    .upsert(products, { onConflict: "slug", ignoreDuplicates: true });
  if (productError) {
    return NextResponse.json({ error: `products: ${productError.message}` }, { status: 500 });
  }

  revalidateCatalog();

  return NextResponse.json({
    ok: true,
    seeded: { categories: categories.length, brands: brands.length, products: products.length },
  });
}
