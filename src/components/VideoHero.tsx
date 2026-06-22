"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PriceTag } from "@/components/PriceTag";
import { StarRating } from "@/components/ui/StarRating";
import { cn, formatDropDate } from "@/lib/utils";
import type { Banner, Product } from "@/lib/types";

export interface HeroSlide {
  banner: Banner;
  product: Product;
  brandName: string;
}

interface VideoHeroProps {
  slides: HeroSlide[];
}

const SLIDE_MS = 7500;

export function VideoHero({ slides }: VideoHeroProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const go = (dir: 1 | -1) =>
    setActive((i) => (i + dir + slides.length) % slides.length);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      reduce ? SLIDE_MS * 1.6 : SLIDE_MS,
    );
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  // Play only the active slide's watch video.
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === active) {
        video.currentTime = 0;
        video.play().catch(() => {
          /* poster fallback remains visible */
        });
      } else {
        video.pause();
      }
    });
  }, [active]);

  if (slides.length === 0) return null;

  return (
    <section
      className="band-dark aurora grain relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured watches"
    >
      <div className="shell relative z-[2] py-8 sm:py-12">
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {slides.map(({ banner, product, brandName }, i) => {
            const cover = product.images[0];
            const off =
              product.mrp > product.price
                ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                : 0;
            return (
              <article
                key={banner.id}
                className={cn(
                  "transition-all duration-700 ease-showroom",
                  i === active
                    ? "relative opacity-100"
                    : "pointer-events-none absolute inset-0 translate-y-3 opacity-0",
                )}
                aria-hidden={i !== active}
              >
                <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
                  {/* ── Info ── */}
                  <div className={cn("order-2 lg:order-1", i === active && "animate-fade-up")}>
                    <span className="inline-flex items-center gap-2 eyebrow">
                      <span className="h-px w-8 bg-gold" aria-hidden="true" />
                      {banner.eyebrow}
                    </span>
                    <h1 className="mt-4 font-serif text-4xl leading-[1.03] text-balance sm:text-6xl lg:text-7xl">
                      {banner.headline}
                    </h1>
                    <p className="mt-5 max-w-md text-bone/70 sm:text-lg">
                      {banner.subhead}
                    </p>

                    {/* The featured watch */}
                    <div className="mt-7 inline-flex items-center gap-4 rounded-2xl border border-bone/10 bg-ink-700/60 p-3 pr-6 backdrop-blur-md">
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-600">
                        {cover ? (
                          <Image
                            src={cover.url}
                            alt={cover.alt}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-label text-gold">
                          {brandName}
                        </span>
                        <Link
                          href={`/product/${product.slug}`}
                          className="block truncate font-medium transition hover:text-gold"
                        >
                          {product.title}
                        </Link>
                        <span className="mt-1 block">
                          <PriceTag price={product.price} mrp={product.mrp} size="sm" />
                        </span>
                      </span>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <Link href={banner.ctaHref} className="btn-gold shine">
                        {banner.ctaLabel}
                      </Link>
                      <Link
                        href={`/product/${product.slug}`}
                        className="btn-outline border-bone/40 text-bone"
                      >
                        View watch
                      </Link>
                    </div>
                  </div>

                  {/* ── Watch video, inside the card ── */}
                  <div className="order-1 lg:order-2">
                    <div className="gold-border shine group relative overflow-hidden rounded-3xl bg-ink-700 shadow-product-hover">
                      <div className="relative aspect-[4/5] sm:aspect-[16/11] lg:aspect-[4/5]">
                        <video
                          ref={(el) => {
                            videoRefs.current[i] = el;
                          }}
                          className="h-full w-full object-cover"
                          poster={banner.posterUrl}
                          muted
                          loop
                          playsInline
                          preload={i === 0 ? "auto" : "none"}
                          aria-label={`${brandName} ${product.title} in motion`}
                          tabIndex={-1}
                        >
                          <source src={banner.videoUrl} type="video/mp4" />
                        </video>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/20" />

                        {/* Floating discount chip */}
                        {off > 0 ? (
                          <span className="absolute right-4 top-4 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-ink shadow-gold">
                            {off}% OFF
                          </span>
                        ) : null}
                        {product.isPreorder && product.dropDate ? (
                          <span className="absolute left-4 top-4 rounded-full bg-ink/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gold backdrop-blur">
                            Drops {formatDropDate(product.dropDate)}
                          </span>
                        ) : null}

                        {/* Caption */}
                        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                          <span className="rounded-xl bg-ink/55 px-3 py-2 backdrop-blur-md">
                            <span className="block text-[10px] font-semibold uppercase tracking-label text-gold">
                              Now showing
                            </span>
                            <span className="block text-sm font-medium text-bone">
                              {brandName}
                            </span>
                          </span>
                          <StarRating
                            rating={product.rating}
                            reviewCount={product.reviewCount}
                            size="sm"
                            className="rounded-full bg-ink/55 px-3 py-1.5 text-bone backdrop-blur-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Controls */}
          {slides.length > 1 ? (
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {slides.map(({ banner }, i) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === active}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      i === active ? "w-10 bg-gold" : "w-5 bg-bone/30 hover:bg-bone/60",
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous slide"
                  onClick={() => go(-1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-bone/20 text-bone transition hover:bg-gold hover:text-ink"
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={() => go(1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-bone/20 text-bone transition hover:bg-gold hover:text-ink"
                >
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
