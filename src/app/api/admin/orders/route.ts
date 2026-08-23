import { NextResponse } from "next/server";
import { listOrders } from "@/lib/data/orders";
import { isDatabaseConfigured } from "@/lib/db/client";

export async function GET(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "The order database isn't configured yet.", orders: [] },
      { status: 503 },
    );
  }
  const orders = await listOrders();
  return NextResponse.json({ orders });
}
