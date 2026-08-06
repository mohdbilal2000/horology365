import type { CartItem } from "@/lib/types";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING } from "@/lib/config";

/**
 * Pure cart math, deliberately kept out of src/lib/store/cart.ts: that file
 * has "use client" (required by its Zustand hook), and Next.js treats every
 * export from a "use client" module as a client reference — even plain,
 * stateless functions — so calling them from a server Route Handler throws
 * at runtime. These are re-exported from cart.ts for existing client
 * imports, and imported directly here by server code (api/orders,
 * api/razorpay/order).
 */

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartSavings(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + (i.mrp - i.price) * i.quantity, 0);
}

export function cartShipping(subtotal: number): number {
  if (subtotal <= 0 || subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return FLAT_SHIPPING;
}
