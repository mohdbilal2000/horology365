"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore, cartCount } from "@/lib/store/cart";
import { BrandMegaMenu } from "@/components/BrandMegaMenu";
import { SearchModal } from "@/components/SearchModal";
import { Logo } from "@/components/Logo";
import { SITE } from "@/lib/config";
import { whatsappLink } from "@/lib/utils";
import { activeBrands } from "@/lib/mock/brands";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Men", href: "/category/mens-watches" },
  { label: "Women", href: "/category/womens-watches" },
  { label: "Drop", href: "/#weekly-drop" },
  { label: "Offers", href: "/#offers" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.openCart);
  const [count, setCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Avoid hydration mismatch: cart count is client-only (localStorage).
  useEffect(() => {
    setCount(cartCount(items));
  }, [items]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b backdrop-blur-xl transition-all duration-300",
          scrolled
            ? "border-white/10 bg-ink/80 shadow-glass"
            : "border-white/5 bg-ink/55",
        )}
      >
        <div className="shell flex h-16 items-center justify-between gap-4 text-bone lg:h-20">
          {/* Left: mobile toggle + logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-ghost -ml-2 p-2 lg:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <MenuIcon open={mobileOpen} />
            </button>
            <Logo className="h-9 sm:h-11" priority />
            <span className="sr-only">Horology365</span>
          </div>

          {/* Center: desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            <BrandMegaMenu brands={activeBrands} />
            {NAV.map((item) => {
              const active = item.href.startsWith("/category")
                ? pathname === item.href
                : false;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition",
                    active
                      ? "bg-white/10 text-bone"
                      : "text-bone/80 hover:bg-bone/10 hover:text-bone",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              className="btn-ghost p-2.5 text-bone/80 hover:text-bone"
              aria-label="Search watches"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon />
            </button>
            <a
              href={whatsappLink(
                SITE.whatsappNumber,
                "Hi Horology365 👋 I have a question.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost hidden p-2.5 text-bone/80 hover:text-bone sm:inline-flex"
              aria-label="Chat on WhatsApp"
            >
              <WhatsAppIcon />
            </a>
            <button
              type="button"
              className="btn-ghost relative p-2.5 text-bone/80 hover:text-bone"
              aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
              onClick={openCart}
            >
              <BagIcon />
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Mobile drawer nav */}
        <div
          className={cn(
            "overflow-hidden border-t border-bone/10 bg-ink text-bone transition-[max-height] duration-300 ease-showroom lg:hidden",
            mobileOpen ? "max-h-[80vh]" : "max-h-0",
          )}
        >
          <nav className="shell flex flex-col gap-1 py-4" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-base font-medium hover:bg-bone/10"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-bone/10 pt-3">
              <span className="px-3 text-xs font-semibold uppercase tracking-label text-bone/50">
                Brands
              </span>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {activeBrands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/brand/${brand.slug}`}
                    className="rounded-lg px-3 py-2 text-sm text-bone/80 hover:bg-bone/10"
                  >
                    {brand.name}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {open ? (
        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12l1 13H5L6 7z" />
      <path strokeLinecap="round" d="M9 7a3 3 0 016 0" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 001.51 5.26l-.999 3.648 3.978-1.607z" />
    </svg>
  );
}
