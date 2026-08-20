import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { products as seedProducts } from "@/lib/mock/products";
import { revalidateCatalog } from "@/lib/revalidateCatalog";

/**
 * Clears the built-in demo watches so the shop can be filled with real stock.
 *
 * Deletes strictly by the seed catalogue's own slugs — never "everything", and
 * never by date or by a LIKE pattern. A product the admin added is untouchable
 * here even if it shares a title with a demo one, because its slug won't be in
 * this list. That matters: this is the only bulk delete in the admin, and
 * getting it wrong costs real stock that nobody can get back.
 */
export async function DELETE(): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "The product database isn't configured yet." },
      { status: 503 },
    );
  }

  const demoSlugs = seedProducts.map((p) => p.slug);

  const { data, error } = await getSupabaseAdmin()!
    .from("products")
    .delete()
    .in("slug", demoSlugs)
    .select("slug");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateCatalog();
  return NextResponse.json({ ok: true, removed: data?.length ?? 0 });
}
