import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminSession";

/**
 * Two jobs:
 *
 *  1. Gate every /admin route (and the admin APIs) behind a valid, unexpired
 *     session token. Unauthenticated page requests bounce to /admin-login
 *     preserving where they were headed; unauthenticated API requests get a
 *     401 rather than an HTML redirect they can't parse.
 *  2. Attach security headers to every response.
 */

/** Applied to every response. */
function securityHeaders(res: NextResponse, isProd: boolean): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  if (isProd) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const { pathname } = req.nextUrl;

  const isAdminArea =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin/");

  if (!isAdminArea) {
    return securityHeaders(NextResponse.next(), isProd);
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return securityHeaders(NextResponse.next(), isProd);
  }

  if (pathname.startsWith("/api/")) {
    return securityHeaders(
      NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
      isProd,
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin-login";
  url.searchParams.set("next", pathname);
  const res = NextResponse.redirect(url);
  // An expired or tampered cookie is cleared so the browser stops resending it.
  if (token) res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return securityHeaders(res, isProd);
}

export const config = {
  // Everything except Next internals and static files, so security headers are
  // applied site-wide rather than only on /admin.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|mp4|ico|txt|xml)$).*)"],
};
