/** Site-wide configuration sourced from env with safe fallbacks. */

export const SITE = {
  name: "Horology365",
  tagline: "Authentic watches, dropped in batches.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919999999999",
  description:
    "Horology365 — authentic, affordable fashion watches from the brands you love. UPI-secure checkout, easy returns, and pre-order drops every week.",
} as const;

export type PaymentMode = "cod" | "upi" | "both";

/**
 * Current payment mode. COD is live now; UPI is enabled later by
 * flipping NEXT_PUBLIC_PAYMENT_MODE to "upi" or "both".
 */
export const PAYMENT_MODE: PaymentMode =
  (process.env.NEXT_PUBLIC_PAYMENT_MODE as PaymentMode) || "cod";

export const COD_ENABLED = PAYMENT_MODE === "cod" || PAYMENT_MODE === "both";
export const UPI_ENABLED = PAYMENT_MODE === "upi" || PAYMENT_MODE === "both";

export const FREE_SHIPPING_THRESHOLD = 1499;
export const FLAT_SHIPPING = 79;

export const ANALYTICS = {
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID,
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
} as const;
