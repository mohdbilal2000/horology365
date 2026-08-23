import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders/repo";
import { verifyInvoiceToken } from "@/lib/orders/invoiceLink";
import { buildOrderPdf, orderPdfFilename } from "@/lib/pdf/invoice";

/**
 * Serves an order's invoice PDF.
 *
 * Public by necessity — Meta's servers fetch this URL to attach the document to
 * a WhatsApp message, and customers open it from their email — so access is
 * gated on the HMAC in `?t=`, not on a session. A missing or wrong token 404s
 * rather than 403s so the route reveals nothing about which order ids exist.
 */

export const runtime = "nodejs";
// The PDF is generated per-request from stored data; never cache it at the edge.
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t");

  if (!verifyInvoiceToken(id, token)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const order = await getOrder(id);
  if (!order) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const pdf = buildOrderPdf(order);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `inline; filename="${orderPdfFilename(order)}"`,
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
