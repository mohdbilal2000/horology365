import { NextResponse } from "next/server";
import { MAINTENANCE_MODE, maintenanceResponse } from "@/lib/maintenance";
import { blobConfigured } from "@/lib/data/blobClient";
import { listAdminProducts, createProduct } from "@/lib/data/catalogue";
import { revalidateCatalog } from "@/lib/revalidateCatalog";
import type { AdminModel } from "@/lib/types";

/**
 * Admin product list and create. Authentication is handled by middleware.
 *
 * All storage lives in @/lib/data/catalogue, which is where the
 * never-hard-delete and always-audit rules are enforced.
 */

function unavailable() {
  return NextResponse.json(
    { error: "Product storage isn't configured yet." },
    { status: 503 },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!blobConfigured()) return unavailable();

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
  // Maintenance mode — see src/lib/maintenance.ts.
  if (MAINTENANCE_MODE) return maintenanceResponse();

  if (!blobConfigured()) return unavailable();

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
    revalidateCatalog({ brandSlug: model.brandSlug, categorySlug: model.categorySlug });
    return NextResponse.json({ model }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create the product." },
      { status: 500 },
    );
  }
}
