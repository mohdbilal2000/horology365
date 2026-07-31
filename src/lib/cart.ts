import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING } from "@/lib/config";
import type { CartItem } from "@/lib/types";

/**
 * Pure cart maths, shared by the client cart UI and the server order route.
 *
 * These deliberately live outside `@/lib/store/cart` — that module is
 * `"use client"`, and importing a value from it on the server yields a client
 * reference that throws when called ("Attempted to call cartSubtotal() from
 * the server"), which took down every order at runtime.
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
