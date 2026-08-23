import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { listAdminProducts, createProduct } from "@/lib/data/adminProductQueries";
import { revalidateCatalog } from "@/lib/revalidateCatalog";
import type { AdminModel } from "@/lib/types";

/**
 * Admin product list and create. Authentication is handled by middleware.
 *
 * All SQL lives in @/lib/data/adminProductQueries, which is where the
 * never-hard-delete and always-audit rules are enforced.
 */

function unavailable() {
  return NextResponse.json(
    { error: "The product database isn't configured yet." },
    { status: 503 },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isDatabaseConfigured()) return unavailable();

  // ?includeDeleted=true returns only the removed products, for /admin/trash.
  const onlyDeleted =
    new URL(request.url).searchParams.get("includeDeleted") === "true";

  try {
    return NextResponse.json({ models: await listAdminProducts({ onlyDeleted }) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isDatabaseConfigured()) return unavailable();

  let body: Omit<AdminModel, "id" | "createdAt">;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body?.title || !body?.brandSlug || !Array.isArray(body?.variants)) {
    return NextResponse.json({ error: "Missing required product fields." }, { status: 422 });
  }

  try {
    const model = await createProduct(body);
    revalidateCatalog();
    return NextResponse.json({ model }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create the product." },
      { status: 500 },
    );
  }
}
