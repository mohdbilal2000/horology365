import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING } from "@/lib/config";
import type { CartItem } from "@/lib/types";

/**
 * Pure cart arithmetic, shared by the client cart UI and the server order route.
 *
 * These used to live in `store/cart.ts`, which carries a "use client"
 * directive. That made them client references, so importing them from
 * /api/orders threw "Attempted to call cartSubtotal() from the server" at
 * runtime and every checkout failed in a production build. They have no React
 * or store dependency, so they belong in a module neither side has to own.
 *
 * The server recomputes totals from these rather than trusting the client, so a
 * tampered request body cannot set its own price.
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
