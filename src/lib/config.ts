/** Site-wide configuration sourced from env with safe fallbacks. */

/** The shop's own domain. A fact about this deployment, not a setting. */
export const PRODUCTION_SITE_URL = "https://www.horology365.com";

/**
 * Resolves the site's public address.
 *
 * Exported and pure so tests/site-url.test.ts can check the production branch
 * without reloading modules: the localhost fallback reaching production is the
 * exact bug this guards against.
 */
export function resolveSiteUrl(
  explicit: string | undefined,
  nodeEnv: string | undefined,
): string {
  if (explicit) return explicit;
  return nodeEnv === "production" ? PRODUCTION_SITE_URL : "http://localhost:3000";
}

export const SITE = {
  name: "Horology365",
  tagline: "Authentic watches, dropped in batches.",
  /**
   * The site's public address, used for canonical URLs, the sitemap, link
   * previews and the signed invoice links sent to customers.
   *
   * Production must never fall back to localhost. It did: NEXT_PUBLIC_SITE_URL
   * was never set on the deployment, so the live sitemap advertised all 68
   * pages as http://localhost:3000, link previews pointed their image there
   * (which is why no logo appeared when the shop was shared), and an invoice
   * link would have sent a customer to their own machine.
   *
   * The domain is a fact about this shop, not a per-environment setting, so it
   * is the default rather than something an env var has to remember to supply.
   * NEXT_PUBLIC_SITE_URL still overrides it — for a staging domain — and dev
   * still gets localhost.
   */
  url: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV),
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
  /** Store inbox that receives a copy of every order. Defaults to the sender. */
  storeEmail:
    process.env.ORDER_NOTIFY_EMAIL ||
    process.env.ORDER_FROM_EMAIL ||
    "orders@horology365.com",
  /** Store WhatsApp number (digits + country code) that gets a copy. */
  storeWhatsApp:
    process.env.ORDER_NOTIFY_WHATSAPP ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    "919217239733",
} as const;

/**
 * Meta WhatsApp Cloud API credentials. With both present the invoice is pushed
 * as a real WhatsApp document to the customer and the store; without them we
 * fall back to a wa.me link and say so in the response.
 */
export const WHATSAPP = {
  token: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_ID,
  apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
  /** Approved template used to open a conversation outside Meta's 24h window. */
  templateName: process.env.WHATSAPP_TEMPLATE_NAME,
  templateLanguage: process.env.WHATSAPP_TEMPLATE_LANG || "en",
} as const;

export const WHATSAPP_ENABLED = Boolean(WHATSAPP.token && WHATSAPP.phoneNumberId);
export const EMAIL_ENABLED = Boolean(ORDER_NOTIFY.resendApiKey);

/**
 * Secret used to sign invoice download links.
 *
 * Invoice URLs are public by necessity (Meta fetches them to attach the PDF,
 * and customers open them from email), so the link carries an HMAC instead of
 * relying on the order id being hard to guess. Required in production: signing
 * with a public constant would leave every customer's address enumerable.
 */
export function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET must be set in production (it signs invoice links).");
  }
  return "dev-only-insecure-secret";
}

export const ANALYTICS = {
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID,
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
} as const;
