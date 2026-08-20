import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, adminPassword } from "@/lib/adminAuth";

/**
 * Gate every /admin page and /api/admin route behind the shared password.
 * Unauthenticated page requests are bounced to /admin-login (which lives
 * outside this matcher), preserving where they were headed via ?next=.
 * Unauthenticated API requests get a plain 401 instead of an HTML redirect —
 * the admin UI's fetch() calls need JSON, not a redirected login page.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token && token === adminPassword()) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin-login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
