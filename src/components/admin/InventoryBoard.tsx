"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  useCatalogStore,
  unitsInStock,
  preordersReserved,
  type StorageInfo,
} from "@/lib/store/catalog";
import { getBrandBySlug } from "@/lib/mock/brands";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AdminModel, Variant } from "@/lib/types";

export function InventoryBoard() {
  const models = useCatalogStore((s) => s.models);
  const status = useCatalogStore((s) => s.status);
  const error = useCatalogStore((s) => s.error);
  const storage = useCatalogStore((s) => s.storage);
  const saving = useCatalogStore((s) => s.saving);
  const load = useCatalogStore((s) => s.load);
  const adjustStock = useCatalogStore((s) => s.adjustStock);
  const startDelivery = useCatalogStore((s) => s.startDelivery);
  const removeModel = useCatalogStore((s) => s.removeModel);
  const seedSamples = useCatalogStore((s) => s.seedSamples);

  // The catalog lives on the server now, so it is fetched rather than
  // rehydrated from localStorage.
  useEffect(() => {
    void load();
  }, [load]);

  if (status === "idle" || status === "loading") {
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
            Live stock and pre-order pipeline across every brand.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={saving}
            className="rounded-full border border-bone-300 px-4 py-2 text-sm font-medium transition hover:border-gold hover:text-gold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Refresh"}
          </button>
          <Link href="/admin/products/new" className="btn-gold">
            + Add product
          </Link>
        </div>
      </div>

      <StorageNotice storage={storage} />

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

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
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/admin/products/new" className="btn-gold">
              + Add product
            </Link>
            <button
              type="button"
              onClick={() => void seedSamples()}
              disabled={saving}
              className="rounded-full border border-bone-300 px-4 py-2 text-sm font-medium transition hover:border-gold hover:text-gold disabled:opacity-50"
            >
              Load sample products
            </button>
          </div>
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
  onAdjust: (modelId: string, variantId: string, delta: number) => Promise<boolean>;
  onStartDelivery: (modelId: string, variantId: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
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
              className="object-cover"
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
        <span className="hidden text-sm font-semibold sm:block">
          {formatINR(model.price)}
        </span>
        <button
          type="button"
          onClick={() => void onRemove(model.id)}
          aria-label={`Remove ${model.title} from the storefront`}
          title="Removes it from the storefront. The record and its history are kept."
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
                  onClick={() => void onStartDelivery(model.id, v.id)}
                  className="rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-gold-700"
                >
                  Start delivery
                </button>
              ) : (
                <span className="inline-flex items-center rounded-full border border-bone-300">
                  <button
                    type="button"
                    aria-label="Decrease stock"
                    onClick={() => void onAdjust(model.id, v.id, -1)}
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
                    onClick={() => void onAdjust(model.id, v.id, 1)}
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
 * Says plainly where admin changes are being stored.
 *
 * The point of this banner is that an admin should never have to guess whether
 * what they just typed will still be there tomorrow. It stays visible (and
 * amber) until Supabase is configured, because until then a redeploy on a
 * serverless host really can drop the journal.
 */
function StorageNotice({ storage }: { storage: StorageInfo | null }) {
  if (!storage) return null;

  if (storage.durable) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm text-green-800">
        <span aria-hidden="true">✓</span>
        Changes are saved to the database and kept permanently — nothing you edit
        here is ever deleted, and every change is recorded in the{" "}
        <Link href="/admin/audit" className="font-semibold underline">
          audit log
        </Link>
        .
      </p>
    );
  }

  return (
    <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      <strong>Changes are not yet permanently stored.</strong> They are being
      written to an append-only file at{" "}
      <code className="font-mono text-xs">{storage.journalPath}</code>
      {storage.journalDurable
        ? ", which survives restarts on this server."
        : ", which is wiped on every redeploy of a serverless host."}{" "}
      Set <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to
      store them permanently.
    </p>
  );
}
