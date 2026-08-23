/**
 * Admin session tokens, signed with Web Crypto.
 *
 * This module is deliberately Edge-safe: `middleware.ts` runs on the Edge
 * runtime, where `node:crypto` is unavailable, so signing and verification go
 * through `crypto.subtle` — which exists in the Edge runtime, in Node 18+ and
 * in the browser alike. Password checking (scrypt) stays in `adminAuth.ts`,
 * which only ever runs in a Node route handler.
 *
 * Token format: `<issuedAt>.<expiresAt>.<hmac>`. No secret material is carried
 * inside the token, and it expires on its own, so a leaked cookie is a bounded
 * problem rather than a handover of the password itself.
 */

import { appSecret } from "@/lib/config";

export const ADMIN_COOKIE = "h365_admin";

/** Sessions last 7 days. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload: string): Promise<string> {
  const key = await hmacKey();
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

/** Length-independent, branch-free comparison. */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function issueSessionToken(now = Date.now()): Promise<string> {
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;
  const payload = `${issuedAt}.${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

/** Validates signature and expiry. Anything malformed is simply invalid. */
export async function verifySessionToken(
  token: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [issuedAt, expiresAt, signature] = parts as [string, string, string];
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry * 1000 <= now) return false;

  const expected = await sign(`${issuedAt}.${expiresAt}`);
  return constantTimeEquals(signature, expected);
}
