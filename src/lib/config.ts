/** Site-wide configuration sourced from env with safe fallbacks. */

export const SITE = {
  name: "Horology365",
  tagline: "Authentic watches, dropped in batches.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919217239733",
  description:
    "Horology365 — authentic, affordable fashion watches from the brands you love. UPI-secure checkout, easy returns, and pre-order drops every week.",
} as const;

/** Store contact + address, shown in the footer and on the contact page. */
export const CONTACT = {
  phoneDisplay: "+91 92172 39733",
  addressLines: [
    "Horology365",
    "Near Government Higher Secondary School, Half-Nagarjan",
    "Dimapur, Nagaland 797112",
  ],
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

/**
 * Card payments stay completely hidden until a Razorpay key is configured —
 * there's no free way to process real credit/debit cards (unlike UPI, which
 * carries no merchant fee in India), so this only turns on once the business
 * owner deliberately signs up and adds real keys.
 */
export const CARD_ENABLED = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

/**
 * UPI collect details used to render the pay-to VPA + QR at checkout — the
 * business's real UPI ID, overridable via env vars without a code change.
 */
export const UPI = {
  vpa: process.env.NEXT_PUBLIC_UPI_VPA || "8131882560@nyes",
  payeeName: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME || "KIVIKALI Y SHOHE",
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

/**
 * Direct bank transfer (NEFT/IMPS) — a second free, gateway-less payment
 * method: the customer transfers from their own bank app and enters the
 * reference number, same manual-verification pattern as UPI. This is where
 * card payments ultimately settle too, but only once configured inside the
 * Razorpay (or other gateway) dashboard directly — that's a signup-time
 * setting on their end, not something read from these env vars.
 */
export const BANK_ENABLED = process.env.NEXT_PUBLIC_BANK_TRANSFER_ENABLED !== "false";

export const BANK = {
  accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "KIVIKALI Y SHOHE",
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "3490101002557",
  ifsc: process.env.NEXT_PUBLIC_BANK_IFSC || "CNRB0003490",
} as const;

export const FREE_SHIPPING_THRESHOLD = 1499;
export const FLAT_SHIPPING = 79;

export const ANALYTICS = {
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID,
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
} as const;
