import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { revalidateCatalog } from "@/lib/revalidateCatalog";

/**
 * Download-and-restore for the whole catalogue.
 *
 * The shop's products, photos and prices live only in Supabase. A lost or
 * deleted project therefore takes the entire catalogue with it, and re-keying
 * it by hand is the expensive kind of loss. This gives the admin a real copy
 * on their own device that does not depend on any account staying reachable.
 */

const BACKUP_VERSION = 1;

function unavailable() {
  return NextResponse.json(
    { error: "The product database isn't configured yet." },
    { status: 503 },
  );
}

/** GET — a complete catalogue snapshot, served as a dated .json download. */
export async function GET(): Promise<NextResponse | Response> {
  if (!isSupabaseAdminConfigured()) return unavailable();
  const supabase = getSupabaseAdmin()!;

  const [categories, brands, products] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase.from("brands").select("*"),
    supabase.from("products").select("*"),
  ]);

  const failed = [categories, brands, products].find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  const snapshot = {
    version: BACKUP_VERSION,
    takenAt: new Date().toISOString(),
    counts: {
      categories: categories.data?.length ?? 0,
      brands: brands.data?.length ?? 0,
      products: products.data?.length ?? 0,
    },
    categories: categories.data ?? [],
    brands: brands.data ?? [],
    products: products.data ?? [],
  };

  const stamp = snapshot.takenAt.slice(0, 10);
  return new Response(JSON.stringify(snapshot, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="horology365-backup-${stamp}.json"`,
    },
  });
}

/**
 * POST — restore a snapshot.
 *
 * Upserts by slug and never deletes: restoring into a shop that has since
 * gained new stock puts the backup's rows back without discarding anything
 * added in the meantime. Categories and brands go first, because products
 * reference both by foreign key.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();

  let snapshot: {
    version?: number;
    categories?: unknown[];
    brands?: unknown[];
    products?: unknown[];
  };
  try {
    snapshot = await request.json();
  } catch {
    return NextResponse.json({ error: "That file isn't valid JSON." }, { status: 400 });
  }

  if (snapshot?.version !== BACKUP_VERSION) {
    return NextResponse.json(
      { error: "Unrecognised backup file — it wasn't produced by this admin." },
      { status: 422 },
    );
  }
  if (!Array.isArray(snapshot.products) || !Array.isArray(snapshot.brands)) {
    return NextResponse.json({ error: "Backup file is incomplete." }, { status: 422 });
  }

  const supabase = getSupabaseAdmin()!;
  const restored = { categories: 0, brands: 0, products: 0 };

  for (const [table, rows] of [
    ["categories", snapshot.categories ?? []],
    ["brands", snapshot.brands],
    ["products", snapshot.products],
  ] as const) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "slug" });
    if (error) {
      return NextResponse.json(
        { error: `Restoring ${table} failed: ${error.message}` },
        { status: 500 },
      );
    }
    restored[table] = rows.length;
  }

  revalidateCatalog();
  return NextResponse.json({ ok: true, restored });
}
