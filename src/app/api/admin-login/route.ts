import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword } from "@/lib/adminAuth";

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Verify the password and, on success, set the admin session cookie. */
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
  res.cookies.set(ADMIN_COOKIE, adminPassword(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}

/** Log out — clear the cookie. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
