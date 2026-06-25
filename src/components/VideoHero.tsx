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
      <div className="shell relative z-[2] py-6 sm:py-10">
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
                <div className="gold-border glass-dark grid overflow-hidden rounded-3xl shadow-product-hover lg:grid-cols-2">
                  {/* ── Video ── */}
                  <div className="relative order-1 aspect-[5/4] w-full overflow-hidden sm:aspect-[16/9] lg:order-2 lg:aspect-auto lg:min-h-[540px]">
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
                    {/* gradient: blend into the info side + legibility */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-ink/45" />
                    {off > 0 ? (
                      <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-white shadow-gold">
                        {off}% OFF
                      </span>
                    ) : null}
                  </div>

                  {/* ── Info ── */}
                  <div
                    className={cn(
                      "order-2 flex min-w-0 flex-col justify-center gap-4 p-6 sm:gap-5 sm:p-9 lg:order-1 lg:p-12",
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

                    <p className="max-w-md text-[15px] leading-relaxed text-bone/70 sm:text-base">
                      {banner.subhead}
                    </p>

                    {/* Featured watch */}
                    <Link
                      href={`/product/${product.slug}`}
                      className="glass-chip group flex min-w-0 items-center gap-3.5 rounded-2xl p-3 transition hover:bg-white/15"
                    >
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-600">
                        {cover ? (
                          <Image
                            src={cover.url}
                            alt={cover.alt}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[11px] font-semibold uppercase tracking-label text-gold-300">
                          {brandName}
                        </span>
                        <span className="truncate text-sm font-medium text-bone transition group-hover:text-gold-200">
                          {product.title}
                        </span>
                        <span className="mt-1 flex items-center gap-2">
                          <PriceTag price={product.price} mrp={product.mrp} size="sm" />
                        </span>
                      </span>
                      <StarRating
                        rating={product.rating}
                        size="sm"
                        className="hidden shrink-0 text-bone sm:flex"
                      />
                    </Link>

                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={banner.ctaHref} className="btn-gold shine">
                        {banner.ctaLabel}
                      </Link>
                      <Link
                        href={`/product/${product.slug}`}
                        className="btn-outline border-white/30 text-bone"
                      >
                        View watch
                      </Link>
                      {product.isPreorder && product.dropDate ? (
                        <span className="text-xs font-semibold text-gold-300">
                          Drops {formatDropDate(product.dropDate)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Controls */}
          {slides.length > 1 ? (
            <div className="mt-6 flex items-center justify-between">
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
