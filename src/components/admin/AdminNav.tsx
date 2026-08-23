"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products/new", label: "Add product" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/trash", label: "Removed" },
  { href: "/admin/backup", label: "Backup" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin-login", { method: "DELETE" }).catch(() => {});
    router.replace("/admin-login");
    router.refresh();
  }

  return (
    <nav className="hidden items-center gap-1 sm:flex" aria-label="Admin">
      {LINKS.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              active
                ? "bg-gold text-ink shadow-gold"
                : "text-ink-600 hover:bg-bone-300",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={logout}
        className="rounded-full px-4 py-2 text-sm font-semibold text-ink-500 transition hover:bg-bone-300 hover:text-ink"
      >
        Log out
      </button>
    </nav>
  );
}
