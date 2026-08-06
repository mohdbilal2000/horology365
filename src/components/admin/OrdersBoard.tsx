"use client";

import { useEffect, useState } from "react";
import { formatINR, cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "delivered"];

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  shipped: "bg-gold/10 text-gold-700",
  delivered: "bg-ink/10 text-ink-700",
};

export function OrdersBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load orders.");
      setOrders(data.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: OrderStatus) {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-3xl bg-bone-300/60" />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Orders
        </h1>
        <p className="mt-1 text-ink-500">
          Reconcile the UPI reference against your bank app, then mark the order
          paid, shipped or delivered.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize transition",
              filter === s ? "bg-gold text-ink" : "border border-bone-300 text-ink-600 hover:border-gold",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-bone-400 bg-bone-100 py-16 text-center text-ink-500">
          No orders yet.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-3xl border border-bone-300 bg-bone-100 shadow-glass"
            >
              <div className="flex flex-wrap items-center gap-4 border-b border-bone-300 p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold">{order.id}</p>
                  <p className="text-xs text-ink-500">
                    {order.details.name} · {order.details.phone} ·{" "}
                    {new Date(order.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                    STATUS_STYLE[order.status],
                  )}
                >
                  {order.status}
                </span>
                <span className="text-sm font-semibold">{formatINR(order.total)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-4 p-4 text-sm sm:px-5">
                <span className="uppercase tracking-label text-ink-500">
                  {order.details.paymentMethod.replace("_", " ")}
                </span>
                {order.details.upiReference ? (
                  <span className="rounded-lg bg-bone-200 px-2.5 py-1 font-mono text-xs text-ink-700">
                    Ref: {order.details.upiReference}
                  </span>
                ) : null}
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(order.id, s)}
                      disabled={order.status === s}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold capitalize transition",
                        order.status === s
                          ? "cursor-default border-gold bg-gold/10 text-gold-700"
                          : "border-bone-300 text-ink-600 hover:border-gold hover:text-gold",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
