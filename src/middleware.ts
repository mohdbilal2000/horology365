import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, adminPassword } from "@/lib/adminAuth";

/**
 * Gate every /admin route behind the shared password. Unauthenticated requests
 * are bounced to /admin-login (which lives outside this matcher), preserving
 * where they were headed via ?next=.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token && token === adminPassword()) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin-login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
