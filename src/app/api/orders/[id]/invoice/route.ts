import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/data/orders";
import { renderInvoicePdf } from "@/lib/invoice";
import { verifyInvoiceToken } from "@/lib/orders/invoiceLink";

// react-pdf needs Node APIs (Buffer, fs for its built-in fonts) — not
// available on the Edge runtime.
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Serves an order's invoice PDF.
 *
 * Public by necessity — Meta fetches this URL to attach the document to a
 * WhatsApp message, and customers open it from their email — so access is
 * gated on the HMAC in `?t=` rather than on a session. Previously any order id
 * returned the invoice, which left every customer's name, address and phone
 * enumerable by walking ids. A missing or wrong token 404s so the route reveals
 * nothing about which ids exist.
 */
export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;

  const token = new URL(request.url).searchParams.get("t");
  if (!verifyInvoiceToken(id, token)) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const pdf = await renderInvoicePdf(order);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${order.id}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
