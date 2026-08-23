import "server-only";
import { query, queryOne, isDatabaseConfigured } from "@/lib/db/client";
import type { CartItem, CheckoutDetails, Order, OrderStatus } from "@/lib/types";

/**
 * Order persistence.
 *
 * No static fallback — orders never existed as static data — but every function
 * degrades to a no-op when no database is configured, so checkout still
 * completes before the backend is set up.
 */

const ORDER_SELECT =
  "id, items, details, status, subtotal, shipping, total, created_at";

interface OrderRow {
  id: string;
  items: CartItem[];
  details: CheckoutDetails;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: string | Date;
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
    // pg returns timestamptz as a Date; the app's Order type is an ISO string.
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

export async function createOrder(order: Order): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) return { ok: false, error: "DATABASE_URL not configured" };

  try {
    await query(
      `insert into orders
         (id, items, details, payment_method, upi_reference,
          subtotal, shipping, total, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        order.id,
        JSON.stringify(order.items),
        JSON.stringify(order.details),
        order.details.paymentMethod,
        order.details.upiReference ?? null,
        order.subtotal,
        order.shipping,
        order.total,
        order.status,
      ],
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const row = await queryOne<OrderRow>(
      `select ${ORDER_SELECT} from orders where id = $1`,
      [id],
    );
    return row ? rowToOrder(row) : null;
  } catch (err) {
    console.error("[data/orders] getOrderById failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function listOrders(limit = 200): Promise<Order[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await query<OrderRow>(
      `select ${ORDER_SELECT} from orders order by created_at desc limit $1`,
      [limit],
    );
    return rows.map(rowToOrder);
  } catch (err) {
    console.error("[data/orders] listOrders failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const rows = await query(
      "update orders set status = $2, updated_at = now() where id = $1 returning id",
      [id, status],
    );
    return rows.length > 0;
  } catch (err) {
    console.error("[data/orders] updateOrderStatus failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function markOrderPaidViaRazorpay(
  razorpayOrderId: string,
  paymentId: string,
  signature: string,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const rows = await query(
      `update orders
          set status = 'paid',
              razorpay_payment_id = $2,
              razorpay_signature = $3,
              updated_at = now()
        where razorpay_order_id = $1
        returning id`,
      [razorpayOrderId, paymentId, signature],
    );
    return rows.length > 0;
  } catch (err) {
    console.error("[data/orders] markOrderPaid failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function attachRazorpayOrderId(
  orderId: string,
  razorpayOrderId: string,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const rows = await query(
      "update orders set razorpay_order_id = $2 where id = $1 returning id",
      [orderId, razorpayOrderId],
    );
    return rows.length > 0;
  } catch (err) {
    console.error("[data/orders] attachRazorpayOrderId failed:", err instanceof Error ? err.message : err);
    return false;
  }
}
