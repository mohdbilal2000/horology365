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

/**
 * Hosts the Next.js image optimizer is allowed to fetch (see `next.config.ts`).
 * Admins paste product photo links from anywhere and upload data URLs, so any
 * other source has to bypass the optimizer or `next/image` responds 400.
 */
const OPTIMIZABLE_HOSTS = [/(^|\.)unsplash\.com$/, /\.supabase\.co$/];

export function isOptimizableImage(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true; // same-origin asset
  if (!/^https?:\/\//i.test(url)) return false; // data:, blob:, anything odd
  try {
    const { hostname } = new URL(url);
    return OPTIMIZABLE_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

/** Search predicate shared by the seeded catalog and admin-added products. */
export function productMatchesQuery(
  product: { title: string; brandSlug: string; tags: string[] },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    product.title.toLowerCase().includes(q) ||
    product.brandSlug.replace(/-/g, " ").includes(q) ||
    product.tags.some((t) => t.includes(q))
  );
}

/** Build a wa.me deep link with a prefilled message. */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Stable pseudo-id for client-only mock order creation. */
export function generateOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `H365-${stamp}-${rand}`;
}
