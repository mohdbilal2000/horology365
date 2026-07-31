"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, Product } from "@/lib/types";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, brandName: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const MAX_QTY = 10;

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      addItem: (product, brandName, quantity = 1) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === product.id,
          );
          const firstImage = product.images[0];
          if (existing) {
            return {
              isOpen: true,
              items: state.items.map((i) =>
                i.productId === product.id
                  ? {
                      ...i,
                      quantity: Math.min(MAX_QTY, i.quantity + quantity),
                    }
                  : i,
              ),
            };
          }
          const item: CartItem = {
            productId: product.id,
            slug: product.slug,
            title: product.title,
            brandName,
            price: product.price,
            mrp: product.mrp,
            imageUrl: firstImage?.url ?? "",
            imageAlt: firstImage?.alt ?? product.title,
            quantity: Math.min(MAX_QTY, Math.max(1, quantity)),
            isPreorder: product.isPreorder,
          };
          return { isOpen: true, items: [...state.items, item] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.min(MAX_QTY, Math.max(0, quantity)) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "horology365-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

// Derived cart maths live in `@/lib/cart` — they're pure and the server order
// route needs them, which a "use client" module can't provide.
