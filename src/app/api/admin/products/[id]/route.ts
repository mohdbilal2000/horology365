import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { computeDerivedFields } from "@/lib/data/adminProducts";
import type { Variant } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function unavailable() {
  return NextResponse.json({ error: "The product database isn't configured yet." }, { status: 503 });
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
    .select("variants")
    .eq("id", id)
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
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();
  const supabase = getSupabaseAdmin()!;
  const { id } = await params;

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
