import { NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/adminAuth";
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, issueSessionToken } from "@/lib/adminSession";
import { rateLimit, resetRateLimit, clientIp } from "@/lib/rateLimit";

/**
 * Verifies the admin password and issues a signed session cookie.
 *
 * The cookie no longer contains the password — it is a short-lived HMAC token,
 * so reading it grants at most a week of access rather than the credential
 * itself. Attempts are rate-limited to make the shared password impractical to
 * brute-force.
 */

export const runtime = "nodejs";

const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

export async function POST(req: Request) {
  const ip = clientIp(req);
  const key = `admin-login:${ip}`;

  const limited = rateLimit(key, LOGIN_RATE_LIMIT);
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many attempts. Try again in ${Math.ceil(limited.retryAfterSeconds / 60)} minute(s).`,
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";

  if (!verifyAdminPassword(password)) {
    return NextResponse.json(
      { ok: false, error: "Wrong password", attemptsRemaining: limited.remaining },
      { status: 401 },
    );
  }

  // A correct password clears the counter so a few typos don't lock you out.
  resetRateLimit(key);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await issueSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

/** Log out — clear the cookie. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
