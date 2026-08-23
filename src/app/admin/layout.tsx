import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bone-200">
      {/* Password-gated. Changes are saved server-side and never hard-deleted;
          the dashboard banner reports whether that storage is durable yet. */}
      <div className="bg-gold px-4 py-1.5 text-center text-xs font-semibold text-ink">
        Admin · password-protected · every change saved server-side and recorded
        in the audit log
      </div>

      <header className="sticky top-0 z-30 border-b border-bone-300 bg-bone-100/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/admin" className="font-serif text-lg font-bold tracking-tight">
            Horology<span className="text-gold">365</span>
            <span className="ml-2 text-xs font-medium uppercase tracking-label text-ink-500">
              Admin
            </span>
          </Link>
          <AdminNav />
          <Link
            href="/"
            className="text-sm font-medium text-ink-500 transition hover:text-gold"
          >
            View store ↗
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">{children}</main>
    </div>
  );
}
