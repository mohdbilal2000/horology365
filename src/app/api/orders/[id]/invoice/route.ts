import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/data/orders";
import { renderInvoicePdf } from "@/lib/invoice";

// react-pdf needs Node APIs (Buffer, fs for its built-in fonts) — not
// available on the Edge runtime.
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
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
    },
  });
}
