"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  useCatalogStore,
  unitsInStock,
  preordersReserved,
} from "@/lib/store/catalog";
import { adminBrandName, adminModelSlug } from "@/lib/catalog";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AdminModel, Variant } from "@/lib/types";

export function InventoryBoard() {
  const models = useCatalogStore((s) => s.models);
  const adjustStock = useCatalogStore((s) => s.adjustStock);
  const startDelivery = useCatalogStore((s) => s.startDelivery);
  const removeModel = useCatalogStore((s) => s.removeModel);
  const resetToSamples = useCatalogStore((s) => s.resetToSamples);

  // Avoid hydration mismatch (store rehydrates from localStorage on client).
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return <div className="h-64 animate-pulse rounded-3xl bg-bone-300/60" />;
  }

  const totalUnits = models.reduce((s, m) => s + unitsInStock(m), 0);
  const totalReserved = models.reduce((s, m) => s + preordersReserved(m), 0);
  const stockValue = models.reduce(
    (s, m) => s + unitsInStock(m) * m.price,
    0,
  );

  const stats = [
    { label: "Models", value: String(models.length) },
    { label: "Units in stock", value: String(totalUnits) },
    { label: "Pre-orders reserved", value: String(totalReserved) },
    { label: "Stock value", value: formatINR(stockValue) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Inventory
          </h1>
          <p className="mt-1 text-ink-500">
            Live stock and pre-order pipeline across every brand. Everything you
            add here shows on the storefront right away.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetToSamples}
            className="rounded-full border border-bone-300 px-4 py-2 text-sm font-medium transition hover:border-gold hover:text-gold"
          >
            Reset samples
          </button>
          <Link href="/admin/products/new" className="btn-gold">
            + Add product
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
  onStartDelivery,
  onRemove,
}: {
  model: AdminModel;
  onAdjust: (modelId: string, variantId: string, delta: number) => void;
  onStartDelivery: (modelId: string, variantId: string) => void;
  onRemove: (id: string) => void;
}) {
  const brandName = adminBrandName(model);
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
              className="object-cover"
              unoptimized
            />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-label text-ink-500">
            {brandName}
          </span>
          <p className="truncate font-serif text-lg font-bold tracking-tight">
            {model.title}
          </p>
          {model.isSample ? (
            <span className="mt-0.5 inline-block rounded-full bg-bone-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label text-ink-500">
              Sample · not on the storefront
            </span>
          ) : (
            <Link
              href={`/product/${adminModelSlug(model)}`}
              className="mt-0.5 inline-block text-xs font-semibold text-gold transition hover:text-gold-700"
            >
              Live on the storefront ↗
            </Link>
          )}
        </div>
        <span className="hidden text-sm font-semibold sm:block">
          {formatINR(model.price)}
        </span>
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

            <div className="ml-auto flex items-center gap-5">
              <VariantStatus variant={v} />
              {v.availability === "preorder" ? (
                <button
                  type="button"
                  onClick={() => onStartDelivery(model.id, v.id)}
                  className="rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-gold-700"
                >
                  Start delivery
                </button>
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
                  <span className="w-9 text-center text-sm font-semibold tabular-nums">
                    {v.stockQty}
                  </span>
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
