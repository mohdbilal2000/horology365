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

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === active) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [active]);

  if (slides.length === 0) return null;

  return (
    <section
      className="band-dark aurora relative overflow-hidden"
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
                <div className="gold-border glass-dark grid overflow-hidden rounded-[28px] shadow-product-hover lg:grid-cols-[1fr_1.05fr]">
                  {/* ── Info panel ── */}
                  <div
                    className={cn(
                      "order-2 flex flex-col justify-center gap-5 p-7 sm:p-10 lg:order-1 lg:p-14",
                      i === active && "animate-fade-up",
                    )}
                  >
                    <span className="glass-chip inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-label text-gold-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                      {banner.eyebrow}
                    </span>

                    <h1 className="t-display font-bold text-balance">
                      {banner.headline}
                    </h1>

                    <p className="max-w-md text-base leading-relaxed text-bone/70 sm:text-lg">
                      {banner.subhead}
                    </p>

                    {/* Featured watch chip */}
                    <Link
                      href={`/product/${product.slug}`}
                      className="glass-chip group flex w-full max-w-full items-center gap-4 rounded-2xl p-3 pr-5 transition hover:bg-white/15"
                    >
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
                        <span className="block text-[11px] font-semibold uppercase tracking-label text-gold-300">
                          {brandName}
                        </span>
                        <span className="block truncate font-medium text-bone transition group-hover:text-gold-200">
                          {product.title}
                        </span>
                        <span className="mt-1 block">
                          <PriceTag price={product.price} mrp={product.mrp} size="sm" />
                        </span>
                      </span>
                    </Link>

                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <Link href={banner.ctaHref} className="btn-gold shine">
                        {banner.ctaLabel}
                      </Link>
                      <Link
                        href={`/product/${product.slug}`}
                        className="btn-outline border-white/30 text-bone"
                      >
                        View watch
                      </Link>
                    </div>
                  </div>

                  {/* ── Watch video ── */}
                  <div className="relative order-1 min-h-[280px] lg:order-2 lg:min-h-[600px]">
                    <video
                      ref={(el) => {
                        videoRefs.current[i] = el;
                      }}
                      className="absolute inset-0 h-full w-full object-cover [object-position:center]"
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
                    {/* readability + blend into the card on the left edge */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-ink/60 lg:to-ink/40" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />

                    {off > 0 ? (
                      <span className="glass-chip absolute right-5 top-5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white">
                        {off}% OFF
                      </span>
                    ) : null}
                    {product.isPreorder && product.dropDate ? (
                      <span className="glass-chip absolute left-5 top-5 rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gold-200">
                        Drops {formatDropDate(product.dropDate)}
                      </span>
                    ) : null}

                    <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
                      <span className="glass-chip rounded-2xl px-3.5 py-2">
                        <span className="block text-[10px] font-semibold uppercase tracking-label text-gold-200">
                          Now showing
                        </span>
                        <span className="block text-sm font-medium text-white">
                          {brandName}
                        </span>
                      </span>
                      <StarRating
                        rating={product.rating}
                        reviewCount={product.reviewCount}
                        size="sm"
                        className="glass-chip rounded-full px-3.5 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Controls */}
          {slides.length > 1 ? (
            <div className="mt-7 flex items-center justify-between">
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
                      i === active ? "w-10 bg-gold" : "w-5 bg-white/25 hover:bg-white/50",
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous slide"
                  onClick={() => go(-1)}
                  className="glass-chip flex h-11 w-11 items-center justify-center rounded-full text-bone transition hover:bg-gold hover:text-white"
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={() => go(1)}
                  className="glass-chip flex h-11 w-11 items-center justify-center rounded-full text-bone transition hover:bg-gold hover:text-white"
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
