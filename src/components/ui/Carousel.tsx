"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CarouselProps {
  children: ReactNode;
  className?: string;
  /** Accessible label for the scroll region. */
  label: string;
  /** Tone controls the arrow styling against dark / light bands. */
  tone?: "dark" | "light";
}

export function Carousel({
  children,
  className,
  label,
  tone = "light",
}: CarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setAtStart(scrollLeft <= 4);
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  const arrowBase =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-product-hover transition disabled:opacity-0 md:flex";
  const arrowTone =
    tone === "dark"
      ? "border-bone/20 bg-ink-700 text-bone hover:bg-gold hover:text-ink"
      : "border-bone-300 bg-bone-100 text-ink hover:bg-gold hover:text-ink";

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        disabled={atStart}
        className={cn(arrowBase, arrowTone, "-left-3 lg:-left-5")}
      >
        <span aria-hidden="true">‹</span>
      </button>

      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 sm:gap-5"
      >
        {children}
      </div>

      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        disabled={atEnd}
        className={cn(arrowBase, arrowTone, "-right-3 lg:-right-5")}
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
