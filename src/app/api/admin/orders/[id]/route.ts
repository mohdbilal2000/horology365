import { NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/data/orders";
import { isSupabaseAdminConfigured } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";

const VALID_STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "delivered"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "The order database isn't configured yet." }, { status: 503 });
  }
  const { id } = await params;

  let body: { status?: OrderStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 422 });
  }

  const ok = await updateOrderStatus(id, body.status);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
