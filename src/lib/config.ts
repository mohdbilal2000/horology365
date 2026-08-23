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

/**
 * Where order notifications go.
 *
 * Every order produces a PDF that is sent to the customer AND to the store, so
 * there is always a second copy of the record outside the database.
 */
export const ORDER_NOTIFY = {
  /** Resend API key. Without it, email delivery is skipped (and reported as such). */
  resendApiKey: process.env.RESEND_API_KEY,
  /** Verified sender address on your Resend domain. */
  fromEmail: process.env.ORDER_FROM_EMAIL || "orders@horology365.com",
  /** Store inbox that receives a copy of every order. Falls back to the sender. */
  storeEmail:
    process.env.ORDER_NOTIFY_EMAIL || process.env.ORDER_FROM_EMAIL || "orders@horology365.com",
  /** Store WhatsApp number (digits only, with country code) that gets a copy. */
  storeWhatsApp:
    process.env.ORDER_NOTIFY_WHATSAPP ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    "919217239733",
} as const;

/**
 * Meta WhatsApp Cloud API credentials. When both are present the order PDF is
 * pushed as a real WhatsApp document to the customer and the store; when they
 * are absent we fall back to a wa.me link and say so in the response.
 */
export const WHATSAPP = {
  token: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_ID,
  apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
  /** Pre-approved template used to open a conversation outside the 24h window. */
  templateName: process.env.WHATSAPP_TEMPLATE_NAME,
  templateLanguage: process.env.WHATSAPP_TEMPLATE_LANG || "en",
} as const;

export const WHATSAPP_ENABLED = Boolean(WHATSAPP.token && WHATSAPP.phoneNumberId);
export const EMAIL_ENABLED = Boolean(ORDER_NOTIFY.resendApiKey);

/**
 * Secret used to sign invoice download links and the admin session cookie.
 * MUST be set in production; the fallback exists only so local dev boots.
 */
export function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    // Fail loudly rather than signing production tokens with a public constant.
    throw new Error(
      "APP_SECRET must be set in production (used to sign invoice links and admin sessions).",
    );
  }
  return "dev-only-insecure-secret";
}

export const ANALYTICS = {
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID,
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
} as const;
