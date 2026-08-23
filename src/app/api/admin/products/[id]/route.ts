import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import {
  adminModelToUpdateRow,
  computeDerivedFields,
  rowToAdminModel,
  PRODUCT_COLUMNS,
  type ProductRowForAdmin,
} from "@/lib/data/adminProducts";
import { ensureBrandExists } from "@/lib/data/adminBrands";
import { revalidateCatalog } from "@/lib/revalidateCatalog";
import { recordAudit } from "@/lib/data/adminAudit";
import type { AdminModel, Variant } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function unavailable() {
  return NextResponse.json({ error: "The product database isn't configured yet." }, { status: 503 });
}

/** Loads a single product for the admin edit screen. */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();
  const supabase = getSupabaseAdmin()!;
  const { id } = await params;

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ model: rowToAdminModel(data as ProductRowForAdmin) });
}

/** Full edit — replaces every editable field of an existing product. The slug
 *  is left untouched so the public product URL keeps working. */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();
  const supabase = getSupabaseAdmin()!;
  const { id } = await params;

  let body: Omit<AdminModel, "id" | "createdAt">;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body?.title || !body?.brandSlug || !Array.isArray(body?.variants)) {
    return NextResponse.json({ error: "Missing required product fields." }, { status: 422 });
  }

  await ensureBrandExists(supabase, body.brandSlug);

  // A removed product is edited by restoring it first, not by writing through
  // the deletion.
  const { data: previous } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  const { data, error } = await supabase
    .from("products")
    .update({ ...adminModelToUpdateRow(body), updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const model = rowToAdminModel(data as ProductRowForAdmin);
  await recordAudit(supabase, {
    action: "product.update",
    targetId: id,
    summary: `Updated "${model.title}"`,
    before: previous ? rowToAdminModel(previous as ProductRowForAdmin) : null,
    after: model,
  });

  revalidateCatalog();
  return NextResponse.json({ model });
}

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();
  const supabase = getSupabaseAdmin()!;
  const { id } = await params;

  let body: { variantId?: string; delta?: number; action?: "startDelivery" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.variantId) {
    return NextResponse.json({ error: "variantId is required." }, { status: 422 });
  }

  const { data: row, error: readError } = await supabase
    .from("products")
    .select("title, variants")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError || !row) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const variants: Variant[] = (row.variants ?? []).map((v: Variant) => {
    if (v.id !== body.variantId) return v;
    if (body.action === "startDelivery") {
      return { ...v, availability: "in_delivery" as const, stockQty: v.preorderReserved };
    }
    if (typeof body.delta === "number") {
      return { ...v, stockQty: Math.max(0, v.stockQty + body.delta) };
    }
    return v;
  });

  const { stock, isPreorder, dropDate } = computeDerivedFields(variants);
  const { error: writeError } = await supabase
    .from("products")
    .update({
      variants,
      stock,
      is_preorder: isPreorder,
      drop_date: dropDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (writeError) {
    return NextResponse.json({ error: writeError.message }, { status: 500 });
  }

  const changed = variants.find((v) => v.id === body.variantId);
  await recordAudit(supabase, {
    action: "product.stock",
    targetId: id,
    summary:
      body.action === "startDelivery"
        ? `${row.title} · ${changed?.name ?? body.variantId}: pre-orders moved to delivery`
        : `${row.title} · ${changed?.name ?? body.variantId}: stock ${body.delta && body.delta > 0 ? "+" : ""}${body.delta ?? 0} -> ${changed?.stockQty ?? "?"}`,
    before: (row.variants ?? []).find((v: Variant) => v.id === body.variantId) ?? null,
    after: changed ?? null,
  });

  revalidateCatalog();
  return NextResponse.json({ ok: true });
}

/**
 * Removes a product from the storefront — as a SOFT delete.
 *
 * This used to be `.delete()`, which destroyed the row and with it every image
 * the owner had uploaded for that product, unrecoverably. It now stamps
 * `deleted_at`: the product disappears from the shop and the admin list, but
 * the record is kept in full and can be brought back via POST (restore) or
 * from /admin/trash. A Postgres trigger blocks a real DELETE as a backstop.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();
  const supabase = getSupabaseAdmin()!;
  const { id } = await params;

  const { data, error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const model = rowToAdminModel(data as ProductRowForAdmin);
  await recordAudit(supabase, {
    action: "product.delete",
    targetId: id,
    summary: `Removed "${model.title}" from the storefront (kept in records)`,
    before: model,
    after: null,
  });

  revalidateCatalog();
  return NextResponse.json({ ok: true, model });
}

/** Restores a soft-deleted product, images and variants intact. */
export async function POST(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();
  const supabase = getSupabaseAdmin()!;
  const { id } = await params;

  const { data, error } = await supabase
    .from("products")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const model = rowToAdminModel(data as ProductRowForAdmin);
  await recordAudit(supabase, {
    action: "product.restore",
    targetId: id,
    summary: `Restored "${model.title}"`,
    after: model,
  });

  revalidateCatalog();
  return NextResponse.json({ ok: true, model });
}
