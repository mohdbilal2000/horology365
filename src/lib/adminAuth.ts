/**
 * Admin authentication.
 *
 * The gate is still a single shared password — this is a one-person showroom,
 * not a multi-tenant system — but the way it is stored and carried is no longer
 * naive:
 *
 *  - The password may be supplied pre-hashed via ADMIN_PASSWORD_HASH, so the
 *    plaintext never has to exist in the hosting dashboard or in a .env file.
 *  - Comparison is constant-time, so the password can't be recovered by timing.
 *  - The session cookie is no longer the password. It is an HMAC-signed,
 *    expiring token issued by `adminSession.ts`; previously the cookie *was*
 *    the password in plaintext, so anyone who read one cookie (a shared
 *    machine, a browser extension, a support screenshot) held the credential
 *    itself, and it never expired.
 *
 * This module is Node-only — scrypt is not available on the Edge runtime, so
 * middleware uses `adminSession.ts` instead.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 32;

/** Fallback used only when neither env var is set, so local dev still boots. */
const DEFAULT_PASSWORD = "showroom2026";

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Hashes a password for storage in ADMIN_PASSWORD_HASH.
 * Format: `scrypt$<saltHex>$<hashHex>`. Generate one with `npm run admin:hash`.
 */
export function hashPassword(password: string, salt?: Buffer): string {
  const useSalt = salt ?? randomBytes(16);
  const derived = scryptSync(password, useSalt, SCRYPT_KEYLEN);
  return `scrypt$${useSalt.toString("hex")}$${derived.toString("hex")}`;
}

/** Verifies a candidate against a `scrypt$salt$hash` string. */
function verifyHashed(candidate: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  try {
    const derived = scryptSync(candidate, Buffer.from(saltHex, "hex"), SCRYPT_KEYLEN);
    const expected = Buffer.from(hashHex, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * True when `candidate` is the admin password.
 * ADMIN_PASSWORD_HASH wins over ADMIN_PASSWORD when both are set.
 */
export function verifyAdminPassword(candidate: string): boolean {
  const hashed = process.env.ADMIN_PASSWORD_HASH;
  if (hashed) return verifyHashed(candidate, hashed);

  const plain = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
  return constantTimeEquals(candidate, plain);
}

/** True when the deployment is still relying on the built-in default password. */
export function usingDefaultPassword(): boolean {
  return !process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD;
}
