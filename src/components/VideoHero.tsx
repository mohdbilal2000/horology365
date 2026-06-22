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

const SLIDE_MS = 7000;

export function VideoHero({ slides }: VideoHeroProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const go = (dir: 1 | -1) =>
    setActive((i) => (i + dir + slides.length) % slides.length);

  // Auto-advance (pauses on hover/focus).
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      reduce ? SLIDE_MS * 1.6 : SLIDE_MS,
    );
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  // Play only the active slide's ambient video.
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === active) {
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
      className="band-dark"
      aria-roledescription="carousel"
      aria-label="Featured watches"
    >
      <div className="shell py-6 sm:py-10">
        <div
          className="relative overflow-hidden rounded-3xl border border-bone/10 bg-ink-800 shadow-product-hover"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {slides.map(({ banner, product, brandName }, i) => {
            const cover = product.images[0];
            return (
              <article
                key={banner.id}
                className={cn(
                  "transition-opacity duration-700 ease-showroom",
                  i === active
                    ? "relative opacity-100"
                    : "pointer-events-none absolute inset-0 opacity-0",
                )}
                aria-hidden={i !== active}
              >
                {/* Ambient muted video + poster, behind a dark gradient. */}
                <div className="absolute inset-0">
                  <video
                    ref={(el) => {
                      videoRefs.current[i] = el;
                    }}
                    className="h-full w-full object-cover opacity-40"
                    poster={banner.posterUrl}
                    muted
                    loop
                    playsInline
                    preload={i === 0 ? "metadata" : "none"}
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <source src={banner.videoUrl} type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent" />
                </div>

                <div className="relative grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-2 lg:gap-10 lg:p-14">
                  {/* Info */}
                  <div
                    className={cn(
                      "order-2 lg:order-1",
                      i === active && "animate-fade-up",
                    )}
                  >
                    <span className="eyebrow">{banner.eyebrow}</span>
                    <h2 className="mt-3 font-serif text-4xl leading-[1.05] text-balance sm:text-5xl lg:text-6xl">
                      {banner.headline}
                    </h2>
                    <p className="mt-4 max-w-md text-bone/75 sm:text-lg">
                      {banner.subhead}
                    </p>

                    {/* The watch on this slide */}
                    <div className="mt-6 inline-flex items-center gap-4 rounded-2xl border border-bone/10 bg-ink-700/70 p-3 pr-5 backdrop-blur">
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
                        <span className="mt-1 flex items-center gap-3">
                          <PriceTag
                            price={product.price}
                            mrp={product.mrp}
                            size="sm"
                          />
                        </span>
                      </span>
                    </div>

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <Link href={banner.ctaHref} className="btn-gold">
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

                  {/* Product showcase image with slow Ken Burns motion */}
                  <div className="order-1 lg:order-2">
                    <div className="product-frame relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink-600 sm:aspect-[5/4] lg:aspect-[4/5]">
                      {cover ? (
                        <Image
                          src={cover.url}
                          alt={cover.alt}
                          fill
                          priority={i === 0}
                          sizes="(max-width: 1024px) 100vw, 40vw"
                          className={cn(
                            "object-cover transition-transform duration-[6000ms] ease-out",
                            i === active ? "scale-110" : "scale-100",
                          )}
                        />
                      ) : null}
                      <div className="absolute left-4 top-4 flex items-center gap-2">
                        {product.isPreorder ? (
                          <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">
                            {product.dropDate
                              ? `Drops ${formatDropDate(product.dropDate)}`
                              : "Pre-order"}
                          </span>
                        ) : null}
                      </div>
                      <div className="absolute bottom-4 right-4 rounded-full bg-ink/70 px-3 py-1.5 backdrop-blur">
                        <StarRating
                          rating={product.rating}
                          reviewCount={product.reviewCount}
                          size="sm"
                          className="text-bone"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Controls */}
          {slides.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => go(-1)}
                className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-bone/20 bg-ink/60 text-bone backdrop-blur transition hover:bg-gold hover:text-ink sm:flex"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => go(1)}
                className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-bone/20 bg-ink/60 text-bone backdrop-blur transition hover:bg-gold hover:text-ink sm:flex"
              >
                <span aria-hidden="true">›</span>
              </button>
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                {slides.map(({ banner }, i) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === active}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === active ? "w-9 bg-gold" : "w-4 bg-bone/40 hover:bg-bone/70",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
