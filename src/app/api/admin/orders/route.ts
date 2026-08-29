import { NextResponse } from "next/server";
import { listOrders } from "@/lib/data/orders";
import { blobConfigured } from "@/lib/data/blobClient";

export async function GET(): Promise<NextResponse> {
  if (!blobConfigured()) {
    return NextResponse.json(
      { error: "Order storage isn't configured yet.", orders: [] },
      { status: 503 },
    );
  }
  const orders = await listOrders();
  return NextResponse.json({ orders });
}
