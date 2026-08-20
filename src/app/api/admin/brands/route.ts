import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { revalidateCatalog } from "@/lib/revalidateCatalog";

const BRAND_COLUMNS = "id, slug, name, tagline, logo_url, cover_url, is_active, sort_order";

function unavailable() {
  return NextResponse.json(
    { error: "The product database isn't configured yet." },
    { status: 503 },
  );
}

/** Every brand, in showcase order — including hidden ones, which the admin still needs to see to unhide. */
export async function GET(): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();

  const { data, error } = await getSupabaseAdmin()!
    .from("brands")
    .select(BRAND_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brands: data });
}

/**
 * Saves the showcase order and visibility for every brand in one go.
 *
 * The whole list is written at once rather than one brand at a time: position
 * is relative, so saving a single row would leave the rest contradicting it
 * (two brands claiming third place) if a later write failed.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();

  let body: { brands?: { slug: string; sortOrder: number; isActive: boolean }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const brands = body?.brands;
  if (!Array.isArray(brands) || brands.length === 0) {
    return NextResponse.json({ error: "No brands supplied." }, { status: 422 });
  }
  const malformed = brands.some(
    (b) =>
      typeof b?.slug !== "string" ||
      !b.slug ||
      typeof b?.sortOrder !== "number" ||
      !Number.isFinite(b.sortOrder) ||
      typeof b?.isActive !== "boolean",
  );
  if (malformed) {
    return NextResponse.json({ error: "Malformed brand entry." }, { status: 422 });
  }

  const supabase = getSupabaseAdmin()!;
  for (const brand of brands) {
    const { error } = await supabase
      .from("brands")
      .update({ sort_order: brand.sortOrder, is_active: brand.isActive })
      .eq("slug", brand.slug);
    if (error) {
      return NextResponse.json(
        { error: `Couldn't save ${brand.slug}: ${error.message}` },
        { status: 500 },
      );
    }
  }

  revalidateCatalog();
  return NextResponse.json({ ok: true, saved: brands.length });
}
