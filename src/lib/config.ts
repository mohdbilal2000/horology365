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
 * Current payment mode. UPI is live now (pay to our VPA via any UPI app);
 * Cash on Delivery is "coming soon" and switched on later by setting
 * NEXT_PUBLIC_PAYMENT_MODE to "cod" or "both".
 */
export const PAYMENT_MODE: PaymentMode =
  (process.env.NEXT_PUBLIC_PAYMENT_MODE as PaymentMode) || "upi";

export const COD_ENABLED = PAYMENT_MODE === "cod" || PAYMENT_MODE === "both";
export const UPI_ENABLED = PAYMENT_MODE === "upi" || PAYMENT_MODE === "both";

/** UPI collect details used to render the pay-to VPA + QR at checkout. */
export const UPI = {
  vpa: process.env.NEXT_PUBLIC_UPI_VPA || "horology365@upi",
  payeeName: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME || "Horology365",
} as const;

/** Build a standard UPI deep-link / QR payload (NPCI URI scheme). */
export function buildUpiUri(amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: UPI.vpa,
    pn: UPI.payeeName,
    am: String(amount),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

export const FREE_SHIPPING_THRESHOLD = 1499;
export const FLAT_SHIPPING = 79;

export const ANALYTICS = {
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID,
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
} as const;
