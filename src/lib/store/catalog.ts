"use client";

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  adminModelSlug,
  adminModelToProduct,
  inScope,
  type CatalogScope,
} from "@/lib/catalog";
import type { AdminModel, Product, Variant } from "@/lib/types";

/**
 * Phase 1 admin catalog — a client-side prototype of the Brand → Model →
 * Variant inventory "sync ecosystem". Persisted to localStorage so the admin
 * is fully interactive without a backend. In Phase 2 this store is replaced by
 * Supabase queries + Realtime with the same shape, and stock decrements move
 * to an atomic server RPC.
 */
interface CatalogState {
  models: AdminModel[];
  addModel: (model: AdminModel) => void;
  removeModel: (id: string) => void;
  adjustStock: (modelId: string, variantId: string, delta: number) => void;
  startDelivery: (modelId: string, variantId: string) => void;
  resetToSamples: () => void;
}

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

const SAMPLES: AdminModel[] = [
  {
    id: "m-sample-gshock",
    isSample: true,
    brandSlug: "casio",
    slug: "casio-g-shock-ga2100-sample",
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
    id: "m-sample-lexington",
    isSample: true,
    brandSlug: "michael-kors",
    slug: "mk-lexington-chronograph-sample",
    title: "Lexington Chronograph",
    categorySlug: "womens-watches",
    description:
      "A glamorous gold-tone chronograph with a pavé bezel — jet-set sparkle for the wrist.",
    price: 21995,
    mrp: 26995,
    imageUrl:
      "https://images.unsplash.com/photo-1526045431048-f857369baa09?auto=format&fit=crop&w=1200&q=70",
    variants: sampleVariants(8050),
    createdAt: "2026-06-03T00:00:00.000Z",
  },
];

export const STORAGE_KEY = "horology365-admin-catalog";

/**
 * localStorage is the Phase-1 backing store, and uploaded photos are kept as
 * data URLs — so a write can hit the ~5MB quota. Fail loudly in the console
 * rather than throwing out of a React event handler and blanking the page;
 * the product builder checks the budget up-front (see `catalogBytesFree`).
 */
const safeStorage = createJSONStorage(() => ({
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn(
        "[horology365] Admin catalog is too large to save in this browser. " +
          "Remove a product or use image links instead of uploads.",
      );
    }
  },
  removeItem: (key: string) => localStorage.removeItem(key),
}));

/** Rough budget check before writing a new model (localStorage caps near 5MB). */
export function catalogBytesFree(): number {
  const BUDGET = 4_200_000;
  if (typeof localStorage === "undefined") return BUDGET;
  return Math.max(0, BUDGET - (localStorage.getItem(STORAGE_KEY)?.length ?? 0));
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      models: SAMPLES,
      addModel: (model) =>
        set((state) => ({ models: [model, ...state.models] })),
      removeModel: (id) =>
        set((state) => ({ models: state.models.filter((m) => m.id !== id) })),
      adjustStock: (modelId, variantId, delta) =>
        set((state) => ({
          models: state.models.map((m) =>
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
        })),
      startDelivery: (modelId, variantId) =>
        set((state) => ({
          models: state.models.map((m) =>
            m.id !== modelId
              ? m
              : {
                  ...m,
                  variants: m.variants.map((v) =>
                    v.id !== variantId
                      ? v
                      : {
                          ...v,
                          availability: "in_delivery",
                          // Reserved pre-orders become the units now shipping.
                          stockQty: v.preorderReserved,
                        },
                  ),
                },
          ),
        })),
      resetToSamples: () => set({ models: SAMPLES }),
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
    },
  ),
);

// ── Storefront bridge ──
// The storefront is server-rendered from the seeded catalog, so admin products
// are merged in on the client after the persisted store rehydrates. Every hook
// below returns nothing until then, which keeps the first client render
// identical to the server HTML (no hydration mismatch).

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/** Admin models that are actually for sale (demo samples never are). */
export function usePublishedModels(): AdminModel[] {
  const hydrated = useHydrated();
  const models = useCatalogStore((s) => s.models);
  return useMemo(
    () => (hydrated ? models.filter((m) => !m.isSample) : []),
    [hydrated, models],
  );
}

/** Admin-added products for a storefront surface, newest first. */
export function useAdminProducts(scope: CatalogScope = {}): Product[] {
  const models = usePublishedModels();
  const { brandSlug, categorySlug, preorder } = scope;
  return useMemo(
    () =>
      models
        .map(adminModelToProduct)
        .filter((p) => inScope(p, { brandSlug, categorySlug, preorder })),
    [models, brandSlug, categorySlug, preorder],
  );
}

/** Look up a single admin product by its storefront slug. */
export function useAdminProduct(slug: string): Product | undefined {
  const models = usePublishedModels();
  return useMemo(() => {
    const model = models.find((m) => adminModelSlug(m) === slug);
    return model ? adminModelToProduct(model) : undefined;
  }, [models, slug]);
}

/** Every slug already in use by the admin catalog (for unique slug generation). */
export function adminSlugsInUse(models: AdminModel[]): string[] {
  return models.map(adminModelSlug);
}

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
