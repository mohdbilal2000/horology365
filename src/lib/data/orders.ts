import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CartItem, CheckoutDetails, Order, OrderStatus } from "@/lib/types";

/**
 * Order persistence — service-role only, no static fallback (orders never
 * existed as static data). Every function degrades gracefully to a no-op
 * when Supabase isn't configured yet, so checkout never breaks pre-setup.
 */

interface OrderRow {
  id: string;
  items: CartItem[];
  details: CheckoutDetails;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: string;
}

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    items: row.items,
    details: row.details,
    subtotal: row.subtotal,
    shipping: row.shipping,
    total: row.total,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createOrder(order: Order): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.from("orders").insert({
    id: order.id,
    items: order.items,
    details: order.details,
    payment_method: order.details.paymentMethod,
    upi_reference: order.details.upiReference ?? null,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    status: order.status,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("id, items, details, status, subtotal, shipping, total, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToOrder(data as OrderRow);
}

export async function listOrders(limit = 200): Promise<Order[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("id, items, details, status, subtotal, shipping, total, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as OrderRow[]).map(rowToOrder);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}

export async function markOrderPaidViaRazorpay(
  razorpayOrderId: string,
  paymentId: string,
  signature: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", razorpayOrderId);

  return !error;
}

export async function attachRazorpayOrderId(
  orderId: string,
  razorpayOrderId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from("orders")
    .update({ razorpay_order_id: razorpayOrderId })
    .eq("id", orderId);

  return !error;
}
