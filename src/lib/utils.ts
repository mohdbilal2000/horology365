import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Conditional class merge that resolves Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format whole-rupee amounts as Indian-locale currency. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Percentage discount of sale price vs MRP, rounded to nearest integer. */
export function discountPercent(mrp: number, price: number): number {
  if (mrp <= 0 || price >= mrp) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** Human-friendly drop date, e.g. "Drops 12 Jul". */
export function formatDropDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Coming soon";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

/** Default country code for a number typed without one. */
const IN_DIALLING_CODE = "91";

/**
 * Build a wa.me deep link with a prefilled message.
 *
 * wa.me needs the full international number. A number entered the way it is
 * spoken locally — ten digits, or with a leading 0, or as +91-xxxxx — produced
 * a link WhatsApp silently refused to open, which is how the chat button
 * "stopped working" without anything erroring. Normalise to E.164 digits here
 * so every caller is immune to how the number was typed.
 */
export function whatsappLink(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10) digits = IN_DIALLING_CODE + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Stable pseudo-id for client-only mock order creation. */
export function generateOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `H365-${stamp}-${rand}`;
}
