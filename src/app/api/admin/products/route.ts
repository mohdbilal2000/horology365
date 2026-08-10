import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import {
  adminModelToInsertRow,
  rowToAdminModel,
  PRODUCT_COLUMNS,
  type ProductRowForAdmin,
} from "@/lib/data/adminProducts";
import { ensureBrandExists } from "@/lib/data/adminBrands";
import { revalidateCatalog } from "@/lib/revalidateCatalog";
import type { AdminModel } from "@/lib/types";

function unavailable() {
  return NextResponse.json(
    {
      error:
        "The product database isn't configured yet. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, then run `npm run seed`.",
    },
    { status: 503 },
  );
}

export async function GET(): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();
  const supabase = getSupabaseAdmin()!;

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const models = (data as ProductRowForAdmin[]).map(rowToAdminModel);
  return NextResponse.json({ models });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) return unavailable();
  const supabase = getSupabaseAdmin()!;

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

  const row = adminModelToInsertRow(body);
  const { data, error } = await supabase
    .from("products")
    .insert(row)
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  revalidateCatalog();
  return NextResponse.json({ model: rowToAdminModel(data as ProductRowForAdmin) }, { status: 201 });
}
