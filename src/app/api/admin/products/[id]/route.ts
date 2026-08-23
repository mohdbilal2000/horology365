import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  getAdminProduct,
  updateProduct,
  adjustVariant,
  softDeleteProduct,
  restoreProduct,
} from "@/lib/data/adminProductQueries";
import { revalidateCatalog } from "@/lib/revalidateCatalog";
import type { AdminModel } from "@/lib/types";

/**
 * Single-product admin operations. Authentication is handled by middleware.
 *
 * Note what DELETE does *not* do: there is no hard delete anywhere in this
 * codebase. Removing a product stamps `deleted_at`, POST restores it, and the
 * record — including the owner's uploaded images — is kept permanently.
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

function unavailable() {
  return NextResponse.json(
    { error: "The product database isn't configured yet." },
    { status: 503 },
  );
}

function notFound() {
  return NextResponse.json({ error: "Product not found." }, { status: 404 });
}

function failed(err: unknown, fallback: string) {
  console.error(`[admin/products] ${fallback}:`, err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : fallback },
    { status: 500 },
  );
}

/** Loads a single product for the admin edit screen. */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isDatabaseConfigured()) return unavailable();
  const { id } = await params;

  try {
    const model = await getAdminProduct(id);
    return model ? NextResponse.json({ model }) : notFound();
  } catch (err) {
    return failed(err, "Could not load the product.");
  }
}

/** Full edit — replaces every editable field. The slug is left untouched. */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isDatabaseConfigured()) return unavailable();
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

  try {
    const model = await updateProduct(id, body);
    if (!model) return notFound();
    revalidateCatalog();
    return NextResponse.json({ model });
  } catch (err) {
    return failed(err, "Could not save the product.");
  }
}

/** Stock adjustment, or moving a pre-order batch into delivery. */
export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isDatabaseConfigured()) return unavailable();
  const { id } = await params;

  let body: {
    variantId?: string;
    delta?: number;
    action?: "startDelivery";
    set?: {
      stockQty?: number;
      preorderTarget?: number;
      preorderReserved?: number;
      availability?: "in_stock" | "preorder" | "in_delivery";
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.variantId) {
    return NextResponse.json({ error: "variantId is required." }, { status: 422 });
  }

  try {
    const model = await adjustVariant(id, body.variantId, {
      delta: body.delta,
      action: body.action,
      set: body.set,
    });
    if (!model) return notFound();
    revalidateCatalog();
    return NextResponse.json({ ok: true, model });
  } catch (err) {
    return failed(err, "Could not adjust stock.");
  }
}

/**
 * Removes a product from the storefront — a SOFT delete.
 *
 * The product disappears from the shop and the admin list, but the record is
 * kept in full and can be brought back via POST or from /admin/trash.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isDatabaseConfigured()) return unavailable();
  const { id } = await params;

  try {
    const model = await softDeleteProduct(id);
    if (!model) return notFound();
    revalidateCatalog();
    return NextResponse.json({ ok: true, model });
  } catch (err) {
    return failed(err, "Could not remove the product.");
  }
}

/** Restores a soft-deleted product, images and variants intact. */
export async function POST(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isDatabaseConfigured()) return unavailable();
  const { id } = await params;

  try {
    const model = await restoreProduct(id);
    if (!model) return notFound();
    revalidateCatalog();
    return NextResponse.json({ ok: true, model });
  } catch (err) {
    return failed(err, "Could not restore the product.");
  }
}
