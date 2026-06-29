/**
 * Phase-1 admin gate — a single shared password protecting /admin.
 *
 * The password comes from the ADMIN_PASSWORD environment variable. If that
 * isn't set (e.g. before you configure it in Vercel), it falls back to a
 * built-in default so the gate still works for testing. CHANGE THIS for real
 * use by setting ADMIN_PASSWORD in your Vercel project settings.
 *
 * Phase 2 replaces this with proper Supabase Auth (real accounts + roles).
 */
export const ADMIN_COOKIE = "h365_admin";

const DEFAULT_PASSWORD = "showroom2026";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}
