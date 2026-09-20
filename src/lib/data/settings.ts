import "server-only";
import { findExact, getJSON, putJSON, blobConfigured } from "@/lib/data/blobClient";
import { UPI, BANK, WHATSAPP, ORDER_NOTIFY } from "@/lib/config";

/**
 * Owner-editable store settings — payment identity (UPI + bank) and the
 * WhatsApp order-notification credentials — kept in Vercel Blob so the owner
 * can change them from /admin/settings without a redeploy.
 *
 * This is the one small, overwritable pointer for configuration; unlike the
 * catalogue and orders it carries no customer history, so it is a single
 * `store/settings/current.json` that the latest save replaces. It is never a
 * source of product/order data, so the append-only data-safety rules don't
 * apply — losing a superseded VPA is not losing the owner's records.
 *
 * The shipped env/config values are the defaults: until an admin saves, and
 * whenever a read fails, the effective settings are exactly today's behaviour.
 * The WhatsApp token is a secret — it is read server-side by the notification
 * path only, never returned to the browser (see toPublicPayment/toAdminView).
 */
const SETTINGS_PATH = "store/settings/current.json";

export interface StoreSettings {
  upiVpa: string;
  upiPayeeName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  /** Store WhatsApp number (digits + country code) for order notifications. */
  storeWhatsApp: string;
  /** Meta WhatsApp Cloud API access token — SECRET. */
  whatsappToken: string;
  /** Meta WhatsApp phone-number id. */
  whatsappPhoneId: string;
  updatedAt: string | null;
}

/** The shipped defaults — env/config values used until an admin saves. */
export function defaultSettings(): StoreSettings {
  return {
    upiVpa: UPI.vpa,
    upiPayeeName: UPI.payeeName,
    bankAccountName: BANK.accountName,
    bankAccountNumber: BANK.accountNumber,
    bankIfsc: BANK.ifsc,
    storeWhatsApp: ORDER_NOTIFY.storeWhatsApp,
    whatsappToken: WHATSAPP.token ?? "",
    whatsappPhoneId: WHATSAPP.phoneNumberId ?? "",
    updatedAt: null,
  };
}

const nonEmpty = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

async function readOverrides(): Promise<Partial<StoreSettings>> {
  if (!blobConfigured()) return {};
  const ptr = await findExact(SETTINGS_PATH);
  if (!ptr) return {};
  return (await getJSON<Partial<StoreSettings>>(ptr.url)) ?? {};
}

/**
 * Effective settings = stored overrides merged over the shipped defaults.
 * Never throws: any failure (unconfigured store, read error) falls back to the
 * defaults, so the payment and notification paths keep working regardless.
 */
export async function readSettings(): Promise<StoreSettings> {
  const base = defaultSettings();
  try {
    const over = await readOverrides();
    return {
      upiVpa: nonEmpty(over.upiVpa, base.upiVpa),
      upiPayeeName: nonEmpty(over.upiPayeeName, base.upiPayeeName),
      bankAccountName: nonEmpty(over.bankAccountName, base.bankAccountName),
      bankAccountNumber: nonEmpty(over.bankAccountNumber, base.bankAccountNumber),
      bankIfsc: nonEmpty(over.bankIfsc, base.bankIfsc),
      storeWhatsApp: nonEmpty(over.storeWhatsApp, base.storeWhatsApp),
      whatsappToken: nonEmpty(over.whatsappToken, base.whatsappToken),
      whatsappPhoneId: nonEmpty(over.whatsappPhoneId, base.whatsappPhoneId),
      updatedAt: typeof over.updatedAt === "string" ? over.updatedAt : base.updatedAt,
    };
  } catch (err) {
    console.error("[data/settings] read failed, using shipped defaults:", err);
    return base;
  }
}

export interface SettingsPatch {
  upiVpa?: string;
  upiPayeeName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  storeWhatsApp?: string;
  /** Empty/omitted = keep the current token (so other fields can be saved
   *  without re-entering the secret). */
  whatsappToken?: string;
  whatsappPhoneId?: string;
}

/**
 * Merge a patch over the current effective settings and store the result.
 * Blank/whitespace fields are ignored (kept as-is) so a stray empty input can
 * never wipe a live VPA, account number or the WhatsApp token.
 */
export async function writeSettings(patch: SettingsPatch): Promise<StoreSettings> {
  if (!blobConfigured()) {
    throw new Error("Settings storage isn't configured yet.");
  }
  const current = await readSettings();
  const next: StoreSettings = {
    upiVpa: nonEmpty(patch.upiVpa, current.upiVpa),
    upiPayeeName: nonEmpty(patch.upiPayeeName, current.upiPayeeName),
    bankAccountName: nonEmpty(patch.bankAccountName, current.bankAccountName),
    bankAccountNumber: nonEmpty(patch.bankAccountNumber, current.bankAccountNumber),
    bankIfsc: nonEmpty(patch.bankIfsc, current.bankIfsc),
    storeWhatsApp: nonEmpty(patch.storeWhatsApp, current.storeWhatsApp),
    whatsappToken: nonEmpty(patch.whatsappToken, current.whatsappToken),
    whatsappPhoneId: nonEmpty(patch.whatsappPhoneId, current.whatsappPhoneId),
    updatedAt: new Date().toISOString(),
  };
  await putJSON(SETTINGS_PATH, next, { overwrite: true });
  return next;
}

// ── Projections ────────────────────────────────────────────────────────────

/** Public payment fields — safe to send to the browser (no secrets). */
export interface PublicPaymentSettings {
  upiVpa: string;
  upiPayeeName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  storeWhatsApp: string;
}

export function toPublicPayment(s: StoreSettings): PublicPaymentSettings {
  return {
    upiVpa: s.upiVpa,
    upiPayeeName: s.upiPayeeName,
    bankAccountName: s.bankAccountName,
    bankAccountNumber: s.bankAccountNumber,
    bankIfsc: s.bankIfsc,
    storeWhatsApp: s.storeWhatsApp,
  };
}

/** Admin view — everything except the raw token, which is masked to its last 4. */
export interface AdminSettingsView {
  upiVpa: string;
  upiPayeeName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  storeWhatsApp: string;
  whatsappPhoneId: string;
  whatsappTokenSet: boolean;
  whatsappTokenHint: string;
  updatedAt: string | null;
}

export function toAdminView(s: StoreSettings): AdminSettingsView {
  const t = s.whatsappToken;
  return {
    upiVpa: s.upiVpa,
    upiPayeeName: s.upiPayeeName,
    bankAccountName: s.bankAccountName,
    bankAccountNumber: s.bankAccountNumber,
    bankIfsc: s.bankIfsc,
    storeWhatsApp: s.storeWhatsApp,
    whatsappPhoneId: s.whatsappPhoneId,
    whatsappTokenSet: Boolean(t),
    whatsappTokenHint: t ? `••••${t.slice(-4)}` : "",
    updatedAt: s.updatedAt,
  };
}

/** Effective WhatsApp Cloud API config for the notification path. */
export interface WhatsAppRuntime {
  token: string;
  phoneNumberId: string;
  storeWhatsApp: string;
  enabled: boolean;
}

export async function getWhatsAppRuntime(): Promise<WhatsAppRuntime> {
  const s = await readSettings();
  return {
    token: s.whatsappToken,
    phoneNumberId: s.whatsappPhoneId,
    storeWhatsApp: s.storeWhatsApp,
    enabled: Boolean(s.whatsappToken && s.whatsappPhoneId),
  };
}
