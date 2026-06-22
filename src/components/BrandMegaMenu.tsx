"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Brand } from "@/lib/types";

interface BrandMegaMenuProps {
  brands: Brand[];
}

export function BrandMegaMenu({ brands }: BrandMegaMenuProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition hover:bg-bone/10",
          open ? "bg-bone/10 text-bone" : "text-bone/80",
        )}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        Brands
        <span
          aria-hidden="true"
          className={cn("text-xs transition-transform", open && "rotate-180")}
        >
          ▾
        </span>
      </button>

      <div
        className={cn(
          "absolute left-1/2 top-full z-50 mt-2 w-[min(92vw,720px)] -translate-x-1/2 rounded-2xl border border-bone-300 bg-bone-100 p-5 text-ink shadow-product-hover transition-all duration-200 ease-showroom",
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0",
        )}
        role="menu"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}`}
              role="menuitem"
              className="group flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-bone-200"
            >
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-bone-200">
                <Image
                  src={brand.logoUrl}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-contain p-1"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium group-hover:text-gold">
                  {brand.name}
                </span>
                <span className="block truncate text-xs text-ink-500">
                  {brand.tagline}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
