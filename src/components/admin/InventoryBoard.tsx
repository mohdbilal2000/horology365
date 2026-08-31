"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getBrandBySlug } from "@/lib/mock/brands";
import { formatINR } from "@/lib/utils";
import {
  unitsInStock,

  inventoryTotals,
  discountPercent,
  discountPerUnit,
  stockValue,
  variantValue,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type { AdminModel, Variant } from "@/lib/types";


export function InventoryBoard() {
  const [models, setModels] = useState<AdminModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load products.");
      setModels(data.models ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function adjustStock(modelId: string, variantId: string, delta: number) {
    setModels((ms) =>
      ms.map((m) =>
        m.id !== modelId
          ? m
          : {
              ...m,
              variants: m.variants.map((v) =>
                v.id !== variantId ? v : { ...v, stockQty: Math.max(0, v.stockQty + delta) },
              ),
            },
      ),
    );
    await fetch(`/api/admin/products/${modelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, delta }),
    });
  }

  /**
   * Writes an exact figure for one variant.
   *
   * Separate from the +/- nudges because a stock count drifts against the real
   * shelf, and a batch size typed wrongly at creation was previously impossible
   * to correct without deleting the product.
   */
  async function setVariant(
    modelId: string,
    variantId: string,
    set: { stockQty?: number; preorderTarget?: number; preorderReserved?: number },
  ) {
    const previous = models;
    setModels((ms) =>
      ms.map((m) =>
        m.id !== modelId
          ? m
          : {
              ...m,
              variants: m.variants.map((v) =>
                v.id !== variantId ? v : { ...v, ...set },
              ),
            },
      ),
    );
    const res = await fetch(`/api/admin/products/${modelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, set }),
    });
    if (!res.ok) {
      setModels(previous);
      setError("Could not save that change. Nothing was altered.");
    }
  }

  async function startDelivery(modelId: string, variantId: string) {
    setModels((ms) =>
      ms.map((m) =>
        m.id !== modelId
          ? m
          : {
              ...m,
              variants: m.variants.map((v) =>
                v.id !== variantId
                  ? v
                  : { ...v, availability: "in_delivery", stockQty: v.preorderReserved },
              ),
            },
      ),
    );
    await fetch(`/api/admin/products/${modelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, action: "startDelivery" }),
    });
  }

  /**
   * Takes a product off the storefront. This is a soft delete: the record and
   * its photos are kept and can be restored from /admin/trash.
   */
  async function removeModel(id: string) {
    const previous = models;
    setModels((ms) => ms.filter((m) => m.id !== id));
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      // Never leave the screen showing a removal that didn't happen.
      setModels(previous);
      setError("Could not remove that product. Nothing was changed.");
      return;
    }
    setNotice("Removed from the storefront. You can restore it from Removed.");
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-3xl bg-bone-300/60" />;
  }

  const t = inventoryTotals(models);

  // Every tile states how its own number is arrived at, so nothing on this page
  // is a figure the owner has to take on trust.
  const stats: { label: string; value: string; note: string }[] = [
    { label: "Products", value: String(t.products),
      note: `${t.variants} colour/strap options` },
    { label: "Units in stock", value: String(t.unitsInStock),
      note: `${t.outOfStock} out of stock · ${t.lowStock} running low` },
    { label: "Stock value", value: formatINR(t.stockValue),
      note: `${t.unitsInStock} units × selling price` },
    { label: "Value at MRP", value: formatINR(t.stockValueAtMrp),
      note: `${formatINR(t.discountOnStock)} given away as discount` },
    { label: "Pre-orders reserved", value: String(t.preordersReserved),
      note: `${formatINR(t.preorderValue)} once collected` },
    { label: "Batch units left", value: String(t.preorderRemaining),
      note: `${t.preorderTarget} ordered in, ${t.preordersReserved} spoken for` },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Inventory
          </h1>
          <p className="mt-1 max-w-xl text-ink-500">
            Live stock and pre-order pipeline across every brand. Every figure
            below is worked out from your own numbers — tap any count to correct
            it, and use Edit to change a price.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/products/new" className="btn-gold">
            + Add product
          </Link>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-bone-300 bg-bone-100 p-5 shadow-glass"
          >
            <p className="text-xs font-semibold uppercase tracking-label text-ink-500">
              {s.label}
            </p>
            <p className="mt-1.5 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-ink-400">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Models */}
      {models.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-bone-400 bg-bone-100 py-16 text-center">
          <p className="font-serif text-xl">No products yet</p>
          <p className="max-w-sm text-sm text-ink-500">
            Add your first model and its variants to start tracking stock and
            pre-orders.
          </p>
          <Link href="/admin/products/new" className="btn-gold">
            + Add product
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {models.map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              onAdjust={adjustStock}
              onSet={setVariant}
              onStartDelivery={startDelivery}
              onRemove={removeModel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelRow({
  model,
  onAdjust,
  onSet,
  onStartDelivery,
  onRemove,
}: {
  model: AdminModel;
  onSet: (
    modelId: string,
    variantId: string,
    set: { stockQty?: number; preorderTarget?: number; preorderReserved?: number },
  ) => void;
  onAdjust: (modelId: string, variantId: string, delta: number) => void;
  onStartDelivery: (modelId: string, variantId: string) => void;
  onRemove: (id: string) => void;
}) {
  const brand = getBrandBySlug(model.brandSlug);
  return (
    <div className="overflow-hidden rounded-3xl border border-bone-300 bg-bone-100 shadow-glass">
      <div className="flex items-center gap-4 border-b border-bone-300 p-4 sm:p-5">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-bone-300">
          {model.imageUrl ? (
            <Image
              src={model.imageUrl}
              alt=""
              fill
              sizes="56px"
              className="object-contain"
              unoptimized
            />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-label text-ink-500">
            {brand?.name ?? model.brandSlug}
          </span>
          <p className="truncate font-serif text-lg font-bold tracking-tight">
            {model.title}
          </p>
        </div>
        <span className="hidden text-right sm:block">
          <span className="block text-sm font-semibold">{formatINR(model.price)}</span>
          {discountPerUnit(model) > 0 ? (
            <span className="block text-xs text-ink-400">
              <span className="line-through">{formatINR(model.mrp)}</span>{" "}
              <span className="text-gold-600">−{discountPercent(model)}%</span>
            </span>
          ) : (
            <span className="block text-xs text-ink-400">no discount</span>
          )}
          <span className="block text-xs text-ink-400">
            {unitsInStock(model)} in stock · {formatINR(stockValue(model))}
          </span>
        </span>
        <Link
          href={`/admin/products/${model.id}/edit`}
          aria-label={`Edit ${model.title}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-bone-300 px-3.5 py-1.5 text-xs font-semibold transition hover:border-gold hover:text-gold"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10-10a2.8 2.8 0 10-4-4L4 16v4z" />
          </svg>
          Edit
        </Link>
        <button
          type="button"
          onClick={() => onRemove(model.id)}
          aria-label={`Delete ${model.title}`}
          className="rounded-full p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" />
          </svg>
        </button>
      </div>

      <ul className="divide-y divide-bone-300">
        {model.variants.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-4 p-4 sm:px-5">
            <span className="flex items-center gap-2.5">
              <span
                className="h-6 w-6 shrink-0 rounded-full ring-1 ring-bone-400"
                style={{ backgroundColor: v.colorHex }}
                aria-hidden="true"
              />
              <span>
                <span className="block text-sm font-semibold leading-tight">
                  {v.name}
                </span>
                <span className="block font-mono text-xs text-ink-400">{v.sku}</span>
              </span>
            </span>

            <span className="text-xs text-ink-400 tabular-nums">
              {formatINR(variantValue(model, v))}
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-4">
              <VariantStatus variant={v} />
              {v.availability === "preorder" ? (
                <>
                  <NumberField
                    label="Batch"
                    title="How many units you are bringing in for this batch"
                    value={v.preorderTarget}
                    onCommit={(n) => onSet(model.id, v.id, { preorderTarget: n })}
                  />
                  <NumberField
                    label="Reserved"
                    title="How many customers have already paid or committed"
                    value={v.preorderReserved}
                    onCommit={(n) => onSet(model.id, v.id, { preorderReserved: n })}
                  />
                  <button
                    type="button"
                    onClick={() => onStartDelivery(model.id, v.id)}
                    className="rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-gold-700"
                  >
                    Start delivery
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center rounded-full border border-bone-300">
                  <button
                    type="button"
                    aria-label="Decrease stock"
                    onClick={() => onAdjust(model.id, v.id, -1)}
                    className="flex h-8 w-8 items-center justify-center text-lg transition hover:text-gold disabled:opacity-30"
                    disabled={v.stockQty <= 0}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    aria-label={`Units of ${v.name} in stock`}
                    title="Type the real count if it has drifted from the shelf"
                    defaultValue={v.stockQty}
                    key={`stock-${v.id}-${v.stockQty}`}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n) && n !== v.stockQty) {
                        onSet(model.id, v.id, { stockQty: Math.max(0, Math.round(n)) });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="w-12 border-0 bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-gold"
                  />
                  <button
                    type="button"
                    aria-label="Increase stock"
                    onClick={() => onAdjust(model.id, v.id, 1)}
                    className="flex h-8 w-8 items-center justify-center text-lg transition hover:text-gold"
                  >
                    +
                  </button>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VariantStatus({ variant: v }: { variant: Variant }) {
  if (v.availability === "preorder") {
    const pct = v.preorderTarget
      ? Math.min(100, Math.round((v.preorderReserved / v.preorderTarget) * 100))
      : 0;
    return (
      <div className="min-w-[150px]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gold-700">Pre-order</span>
          <span className="text-ink-500">
            {v.preorderReserved}/{v.preorderTarget}
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bone-300">
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }
  const low = v.stockQty > 0 && v.stockQty <= 5;
  const out = v.stockQty <= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        v.availability === "in_delivery"
          ? "bg-gold/10 text-gold-700"
          : out
            ? "bg-red-50 text-red-600"
            : low
              ? "bg-amber-50 text-amber-700"
              : "bg-emerald-50 text-emerald-700",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {v.availability === "in_delivery"
        ? "In delivery"
        : out
          ? "Sold out"
          : low
            ? `Low · ${v.stockQty}`
            : "In stock"}
    </span>
  );
}

/**
 * A number the admin can type over.
 *
 * Commits on blur or Enter rather than on every keystroke, so typing "12" isn't
 * saved as "1" on the way past. Keyed on the incoming value so a rejected save
 * that rolls the state back is reflected in the field.
 */
function NumberField({
  label,
  title,
  value,
  onCommit,
}: {
  label: string;
  title: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5" title={title}>
      <span className="text-[10px] font-semibold uppercase tracking-label text-ink-400">
        {label}
      </span>
      <input
        type="number"
        min={0}
        key={`${label}-${value}`}
        defaultValue={value}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n !== value) onCommit(Math.max(0, Math.round(n)));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-16 rounded-lg border border-bone-300 bg-bone-100 px-2 py-1 text-sm font-semibold tabular-nums outline-none focus:border-gold focus:ring-2 focus:ring-gold"
      />
    </label>
  );
}
