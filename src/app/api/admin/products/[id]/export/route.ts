import { NextResponse } from "next/server";
import { isDatabaseConfigured, query } from "@/lib/db/client";
import { BACKUP_VERSION } from "@/lib/data/backup";

/**
 * Downloads one product as a file — photos, description, price, variants,
 * everything — in the same shape `/api/admin/restore` reads, so it doubles as
 * that product's personal backup. The full store backup (`/admin/backup`)
 * covers "lost everything"; this covers "just added this one and want a copy
 * before touching anything else."
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "No database is configured." }, { status: 503 });
  }
  const { id } = await params;

  const rows = await query<Record<string, unknown>>(
    "select * from products where id = $1",
    [id],
  );
  const product = rows[0];
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const takenAt = new Date().toISOString();
  const body = {
    version: BACKUP_VERSION,
    takenAt,
    counts: { products: 1, orders: 0, auditEntries: 0 },
    products: [product],
    orders: [],
    audit: [],
  };

  const slug = String(product.slug ?? id);
  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="horology365-product-${slug}-${takenAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
