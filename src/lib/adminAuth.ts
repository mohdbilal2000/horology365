/**
 * Admin gate — a single shared password protecting /admin, backed by a signed,
 * long-lived session cookie.
 *
 * The password is checked once, at login. On success the admin gets an
 * HMAC-signed token with a one-year expiry; every /admin request afterwards is
 * authorised by verifying that signature, NOT by re-reading the password. This
 * is what stops the "logged out again after a few minutes" problem for good:
 *
 *   - the old cookie stored the plaintext password and the Edge middleware
 *     re-compared it against process.env.ADMIN_PASSWORD on every request, so any
 *     drift of that env between runtimes/regions/deploys silently invalidated a
 *     valid session;
 *   - a signature over a stable secret (APP_SECRET) verifies identically in the
 *     Edge and Node runtimes, and the year-long expiry means the owner simply
 *     stays signed in.
 *
 * All crypto uses Web Crypto (globalThis.crypto.subtle), available in both the
 * Edge runtime (middleware) and the Node runtime (route handlers).
 */
export const ADMIN_COOKIE = "h365_admin";

const DEFAULT_PASSWORD = "showroom2026";

/** Session lifetime in seconds (also the cookie Max-Age): one year. */
export const SESSION_TTL = 60 * 60 * 24 * 365;

/** The shared admin password (checked only at login). */
export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

/**
 * Secret used to sign session tokens. Prefers APP_SECRET (already set in
 * production for invoice links, so it is stable and present in every runtime),
 * then the password, then the default — so signing never throws and is
 * identical wherever it runs.
 */
function sessionSecret(): string {
  return process.env.APP_SECRET || process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

// ── base64url + constant-time compare (Buffer-free, Edge-safe) ──
function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function strToB64url(s: string): string {
  return bytesToB64url(new TextEncoder().encode(s));
}
function b64urlToStr(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToB64url(new Uint8Array(sig));
}

/** Mint a fresh signed session token (payload.signature). */
export async function createSessionToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const payload = strToB64url(JSON.stringify({ v: 1, exp }));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

/** Verify a session token's signature and expiry. Never throws. */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expected: string;
  try {
    expected = await hmac(payload);
  } catch {
    return false;
  }
  if (!safeEqual(sig, expected)) return false;
  try {
    const data = JSON.parse(b64urlToStr(payload)) as { exp?: unknown };
    return typeof data.exp === "number" && data.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
