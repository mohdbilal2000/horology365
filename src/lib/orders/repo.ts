import { insert, select, isSupabaseConfigured } from "@/lib/storage/supabase";
import { append, readAll } from "@/lib/storage/journal";
import type { Order } from "@/lib/types";

/**
 * Order persistence. Supabase when configured; an append-only journal
 * otherwise. Writes are additive only — an order row is never deleted, and
 * status changes are applied as new versions so the history stays intact.
 */

const TABLE = "orders";

/** The row shape stored in Postgres; `payload` keeps the full typed order. */
interface OrderRow {
  id: string;
  created_at: string;
  status: string;
  total: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  payment_method: string;
  upi_reference: string | null;
  payload: Order;
}

function toRow(order: Order): OrderRow {
  return {
    id: order.id,
    created_at: order.createdAt,
    status: order.status,
    total: order.total,
    customer_name: order.details.name,
    customer_phone: order.details.phone,
    customer_email: order.details.email ?? null,
    payment_method: order.details.paymentMethod,
    upi_reference: order.details.upiReference ?? null,
    payload: order,
  };
}

export interface SaveResult {
  /** True when the order reached durable storage (Supabase). */
  durable: boolean;
  /** True when it at least reached the local journal. */
  journaled: boolean;
  error?: string;
}

/**
 * Persists an order. Deliberately does not throw: an order that fails to
 * persist must still be delivered by email/WhatsApp, because those channels
 * are themselves a record. The caller surfaces the degraded state instead.
 */
export async function saveOrder(order: Order): Promise<SaveResult> {
  const journaled = await append(TABLE, toRow(order));

  if (!isSupabaseConfigured()) {
    return { durable: false, journaled };
  }
  try {
    await insert(TABLE, toRow(order), { upsert: true });
    return { durable: true, journaled };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[orders] Supabase write failed:", error);
    return { durable: false, journaled, error };
  }
}

/** Fetches one order by id, preferring the database over the journal. */
export async function getOrder(id: string): Promise<Order | null> {
  if (isSupabaseConfigured()) {
    try {
      const rows = await select<OrderRow>(
        TABLE,
        `id=eq.${encodeURIComponent(id)}&select=payload&limit=1`,
      );
      const found = rows[0]?.payload;
      if (found) return found;
    } catch (err) {
      console.error("[orders] Supabase read failed, falling back to journal:", err);
    }
  }
  const rows = await readAll<OrderRow>(TABLE);
  // Last write wins, matching the upsert semantics above.
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]?.id === id) return rows[i]!.payload;
  }
  return null;
}

/** Most recent orders first — used by the admin dashboard. */
export async function listOrders(limit = 100): Promise<Order[]> {
  if (isSupabaseConfigured()) {
    try {
      const rows = await select<OrderRow>(
        TABLE,
        `select=payload&order=created_at.desc&limit=${limit}`,
      );
      return rows.map((r) => r.payload);
    } catch (err) {
      console.error("[orders] Supabase list failed, falling back to journal:", err);
    }
  }
  const rows = await readAll<OrderRow>(TABLE);
  const seen = new Set<string>();
  const out: Order[] = [];
  for (let i = rows.length - 1; i >= 0 && out.length < limit; i -= 1) {
    const row = rows[i];
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row.payload);
  }
  return out;
}
