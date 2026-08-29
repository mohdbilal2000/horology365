import "server-only";
import { blobConfigured, findExact, getJSON, listPrefix, putJSON, sortableTimestamp, randomSuffix } from "@/lib/data/blobClient";
import type { Order, OrderStatus } from "@/lib/types";

/**
 * Razorpay linkage used to be separate Postgres columns, queried by
 * `razorpay_order_id`. Blob has no query language, so these just ride along
 * on the order's own JSON, and `markOrderPaidViaRazorpay` finds its order by
 * scanning `listOrders()` instead of a WHERE clause — fine at this store's
 * order volume, and it's the same "read everything, filter in memory"
 * pattern the rest of this codebase already uses for products.
 */
type StoredOrder = Order & {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
};

/**
 * Order persistence, in Vercel Blob.
 *
 * `store/orders/<id>/latest.json` is the current state of one order — the
 * only object this module ever overwrites, and only for that one order (a
 * status update can never touch another order's file, so two orders can
 * never race each other). `store/orders/<id>/history/<timestamp>.json` is an
 * immutable snapshot written on every change — creation and every status
 * update — so an order's full history survives even if `latest.json` is ever
 * wrong.
 *
 * No static fallback — orders never existed as static data — but every
 * function degrades to a no-op when Blob isn't configured, so checkout still
 * completes before the backend is set up.
 */

function latestPath(id: string): string {
  return `store/orders/${id}/latest.json`;
}
function historyPath(id: string): string {
  return `store/orders/${id}/history/${sortableTimestamp()}-${randomSuffix()}.json`;
}

async function writeOrder(order: StoredOrder): Promise<void> {
  // History first: even if the pointer write below fails, this version of
  // the order is not lost.
  await putJSON(historyPath(order.id), order);
  await putJSON(latestPath(order.id), order, { overwrite: true });
}

export async function createOrder(order: Order): Promise<{ ok: boolean; error?: string }> {
  if (!blobConfigured()) return { ok: false, error: "BLOB_READ_WRITE_TOKEN not configured" };
  try {
    await writeOrder(order);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getOrderById(id: string): Promise<StoredOrder | null> {
  if (!blobConfigured()) return null;
  try {
    const blob = await findExact(latestPath(id));
    if (!blob) return null;
    return await getJSON<StoredOrder>(blob.url);
  } catch (err) {
    console.error("[data/orders] getOrderById failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Every order's current state, newest first. */
export async function listOrders(limit = 200): Promise<StoredOrder[]> {
  if (!blobConfigured()) return [];
  try {
    const blobs = (await listPrefix("store/orders/")).filter((b) => b.pathname.endsWith("/latest.json"));
    const orders = await Promise.all(blobs.map((b) => getJSON<StoredOrder>(b.url)));
    return orders
      .filter((o): o is StoredOrder => o !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  } catch (err) {
    console.error("[data/orders] listOrders failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<boolean> {
  if (!blobConfigured()) return false;
  try {
    const current = await getOrderById(id);
    if (!current) return false;
    await writeOrder({ ...current, status });
    return true;
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
  if (!blobConfigured()) return false;
  try {
    const orders = await listOrders(1000);
    const order = orders.find((o) => o.razorpayOrderId === razorpayOrderId);
    if (!order) return false;
    await writeOrder({
      ...order,
      status: "paid",
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    });
    return true;
  } catch (err) {
    console.error("[data/orders] markOrderPaid failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function attachRazorpayOrderId(orderId: string, razorpayOrderId: string): Promise<boolean> {
  if (!blobConfigured()) return false;
  try {
    const current = await getOrderById(orderId);
    if (!current) return false;
    await writeOrder({ ...current, razorpayOrderId });
    return true;
  } catch (err) {
    console.error("[data/orders] attachRazorpayOrderId failed:", err instanceof Error ? err.message : err);
    return false;
  }
}
