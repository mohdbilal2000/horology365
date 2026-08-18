"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AdminModel, Variant } from "@/lib/types";

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
    imageUrl:
      "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1200&q=70",
    variants: sampleVariants(4425),
    createdAt: "2026-06-03T00:00:00.000Z",
  },
];

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
      name: "horology365-admin-catalog",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

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
