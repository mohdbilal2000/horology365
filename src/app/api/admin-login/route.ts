import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  SESSION_TTL,
  adminPassword,
  createSessionToken,
} from "@/lib/adminAuth";

/**
 * Domain the session cookie is pinned to.
 *
 * The shop answers on both horology365.com and www.horology365.com. A cookie
 * set without a domain belongs to the exact host that set it, so signing in on
 * one and landing on the other looked like being logged out again and again.
 * Pinning it to the registrable domain makes one sign-in cover both. Preview
 * and localhost hosts get no domain, which is the correct behaviour there.
 */
function cookieDomain(req: Request): string | undefined {
  const host = (req.headers.get("host") ?? "").split(":")[0]!.toLowerCase();
  return host === "horology365.com" || host.endsWith(".horology365.com")
    ? ".horology365.com"
    : undefined;
}

/** Verify the password and, on success, set a signed admin session cookie. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { password?: string }
    | null;
  const password = body?.password ?? "";

  if (password !== adminPassword()) {
    return NextResponse.json(
      { ok: false, error: "Wrong password" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
    domain: cookieDomain(req),
  });
  return res;
}

/** Log out — clear the cookie, both the domain-wide one and any host-only
 *  cookie left over from before the domain above was set. */
export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  const domain = cookieDomain(req);
  if (domain) res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0, domain });
  return res;
}
