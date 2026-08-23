"use client";

import { create } from "zustand";
import type { AdminModel, Variant } from "@/lib/types";

/**
 * Admin catalog store.
 *
 * This used to be a `persist`-wrapped store writing to localStorage, which
 * meant every admin edit lived in exactly one browser: clearing site data,
 * switching to a phone, or opening the admin in a different browser lost the
 * lot, and nothing was recoverable.
 *
 * The server is now the record. This store is a thin client over
 * /api/admin/catalog: it loads on mount, applies each change optimistically for
 * responsiveness, and rolls back if the server rejects the write, so what you
 * see always matches what was actually saved.
 */

export interface StoredModel extends AdminModel {
  deletedAt?: string | null;
  updatedAt?: string;
}

export interface StorageInfo {
  /** True when writes reach Supabase and survive redeploys. */
  durable: boolean;
  /** True when the local journal fallback is on durable disk. */
  journalDurable: boolean;
  journalPath: string;
}

type Status = "idle" | "loading" | "ready" | "error";

interface CatalogState {
  models: StoredModel[];
  status: Status;
  error: string | null;
  storage: StorageInfo | null;
  /** True while a write is in flight. */
  saving: boolean;

  load: (opts?: { includeDeleted?: boolean }) => Promise<void>;
  addModel: (model: AdminModel) => Promise<boolean>;
  updateModel: (model: AdminModel) => Promise<boolean>;
  removeModel: (id: string) => Promise<boolean>;
  restoreModel: (id: string) => Promise<boolean>;
  adjustStock: (modelId: string, variantId: string, delta: number) => Promise<boolean>;
  startDelivery: (modelId: string, variantId: string) => Promise<boolean>;
  seedSamples: () => Promise<boolean>;
}

const ENDPOINT = "/api/admin/catalog";

async function post(body: unknown): Promise<{ ok: boolean; error?: string; model?: StoredModel }> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      model?: StoredModel;
    };
    if (!res.ok) {
      return {
        ok: false,
        error:
          data.error ??
          (res.status === 401
            ? "Your admin session expired. Please sign in again."
            : `Save failed (${res.status}).`),
      };
    }
    return { ok: true, model: data.model };
  } catch {
    return { ok: false, error: "Network error — the change was not saved." };
  }
}

export const useCatalogStore = create<CatalogState>()((set, get) => {
  /**
   * Applies `optimistic` immediately, sends `body`, and restores the previous
   * models on failure so the UI never shows a change that wasn't persisted.
   */
  const write = async (
    body: unknown,
    optimistic: (models: StoredModel[]) => StoredModel[],
  ): Promise<boolean> => {
    const previous = get().models;
    set({ models: optimistic(previous), saving: true, error: null });

    const result = await post(body);
    if (!result.ok) {
      set({ models: previous, saving: false, error: result.error ?? "Save failed." });
      return false;
    }
    set({ saving: false });
    // Re-sync so server-side fields (updatedAt, deletedAt) are authoritative.
    void get().load();
    return true;
  };

  return {
    models: [],
    status: "idle",
    error: null,
    storage: null,
    saving: false,

    load: async (opts) => {
      set((s) => ({ status: s.status === "ready" ? "ready" : "loading" }));
      try {
        const res = await fetch(
          `${ENDPOINT}${opts?.includeDeleted ? "?includeDeleted=true" : ""}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          set({
            status: "error",
            error:
              res.status === 401
                ? "Your admin session expired. Please sign in again."
                : `Could not load the catalog (${res.status}).`,
          });
          return;
        }
        const data = (await res.json()) as { models: StoredModel[]; storage: StorageInfo };
        set({
          models: data.models,
          storage: data.storage,
          status: "ready",
          error: null,
        });
      } catch {
        set({ status: "error", error: "Network error — could not load the catalog." });
      }
    },

    addModel: (model) =>
      write({ action: "save", model }, (models) => [
        { ...model, deletedAt: null } as StoredModel,
        ...models,
      ]),

    updateModel: (model) =>
      write({ action: "save", model }, (models) =>
        models.map((m) => (m.id === model.id ? { ...m, ...model } : m)),
      ),

    removeModel: (id) =>
      // Soft delete on the server; drop from the default view here.
      write({ action: "delete", id }, (models) => models.filter((m) => m.id !== id)),

    restoreModel: (id) =>
      write({ action: "restore", id }, (models) =>
        models.map((m) => (m.id === id ? { ...m, deletedAt: null } : m)),
      ),

    adjustStock: (modelId, variantId, delta) =>
      write({ action: "adjustStock", id: modelId, variantId, delta }, (models) =>
        models.map((m) =>
          m.id !== modelId
            ? m
            : {
                ...m,
                variants: m.variants.map((v) =>
                  v.id !== variantId
                    ? v
                    : { ...v, stockQty: Math.max(0, v.stockQty + delta) },
                ),
              },
        ),
      ),

    startDelivery: (modelId, variantId) =>
      write({ action: "startDelivery", id: modelId, variantId }, (models) =>
        models.map((m) =>
          m.id !== modelId
            ? m
            : {
                ...m,
                variants: m.variants.map((v) =>
                  v.id !== variantId
                    ? v
                    : {
                        ...v,
                        availability: "in_delivery" as const,
                        stockQty: v.preorderReserved,
                      },
                ),
              },
        ),
      ),

    seedSamples: async () => {
      set({ saving: true, error: null });
      for (const model of SAMPLES) {
        const result = await post({ action: "save", model });
        if (!result.ok) {
          set({ saving: false, error: result.error ?? "Could not add the samples." });
          return false;
        }
      }
      set({ saving: false });
      await get().load();
      return true;
    },
  };
});

// ── Sample data ──
// Only written to the server when an admin explicitly asks for it, so a real
// catalog is never silently re-seeded.

const sampleVariants = (base: number): Variant[] => [
  {
    id: `v-${base}-1`,
    name: "Matte Black",
    colorHex: "#1A1A1A",
    sku: `H365-${base}-BLK`,
    availability: "in_stock",
    stockQty: 18,
    preorderTarget: 0,
    preorderReserved: 0,
  },
  {
    id: `v-${base}-2`,
    name: "Steel Silver",
    colorHex: "#C7CDD6",
    sku: `H365-${base}-SLV`,
    availability: "in_stock",
    stockQty: 4,
    preorderTarget: 0,
    preorderReserved: 0,
  },
  {
    id: `v-${base}-3`,
    name: "Champagne Gold",
    colorHex: "#D9BC73",
    sku: `H365-${base}-GLD`,
    availability: "preorder",
    stockQty: 0,
    preorderTarget: 50,
    preorderReserved: 37,
    dropDate: "2026-07-12",
  },
];

export const SAMPLES: AdminModel[] = [
  {
    id: "m-sample-gshock",
    brandSlug: "casio",
    title: "G-Shock GA-2100",
    categorySlug: "mens-watches",
    description:
      "Carbon Core Guard, 200m water resistance and the octagonal bezel that started a cult.",
    price: 9995,
    mrp: 12995,
    imageUrl:
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1200&q=70",
    variants: sampleVariants(2100),
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "m-sample-raga",
    brandSlug: "titan-raga",
    title: "Raga Viva Gold",
    categorySlug: "womens-watches",
    description:
      "Jewellery for the wrist — a gold-tone bracelet watch with a crystal-studded dial.",
    price: 9995,
    mrp: 12995,
    imageUrl: "/posters/womens-watch.jpg",
    variants: sampleVariants(4425),
    createdAt: "2026-06-03T00:00:00.000Z",
  },
];

// ── Derived helpers (pure) ──
export function unitsInStock(model: AdminModel): number {
  return model.variants.reduce(
    (sum, v) => sum + (v.availability !== "preorder" ? v.stockQty : 0),
    0,
  );
}
export function preordersReserved(model: AdminModel): number {
  return model.variants.reduce((sum, v) => sum + v.preorderReserved, 0);
}
export function modelInventoryValue(model: AdminModel): number {
  return model.variants.reduce((sum, v) => sum + v.stockQty * model.price, 0);
}
