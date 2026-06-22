"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Banner } from "@/lib/types";

interface VideoHeroProps {
  banners: Banner[];
}

const SLIDE_MS = 7000;

export function VideoHero({ banners }: VideoHeroProps) {
  const [active, setActive] = useState(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  // Auto-advance slides.
  useEffect(() => {
    if (banners.length <= 1) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduce ? SLIDE_MS * 1.6 : SLIDE_MS;
    const timer = window.setInterval(() => {
      setActive((i) => (i + 1) % banners.length);
    }, delay);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  // Play only the active slide's video.
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

  if (banners.length === 0) return null;

  return (
    <section
      className="relative h-[88vh] min-h-[560px] w-full overflow-hidden bg-ink text-bone"
      aria-roledescription="carousel"
      aria-label="Featured promotions"
    >
      {banners.map((banner, i) => (
        <div
          key={banner.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-showroom",
            i === active ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={i !== active}
        >
          <video
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            className="h-full w-full object-cover"
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

          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/70 to-transparent" />

          <div className="shell relative flex h-full flex-col justify-end pb-20 sm:justify-center sm:pb-0">
            <div className="max-w-2xl">
              <span
                className={cn(
                  "eyebrow transition-all duration-700",
                  i === active
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0",
                )}
              >
                Horology365 · The Showroom
              </span>
              <h1
                className={cn(
                  "mt-4 font-serif text-4xl leading-[1.05] text-balance transition-all delay-100 duration-700 sm:text-6xl lg:text-7xl",
                  i === active
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0",
                )}
              >
                {banner.headline}
              </h1>
              <p
                className={cn(
                  "mt-5 max-w-xl text-base text-bone/80 transition-all delay-200 duration-700 sm:text-lg",
                  i === active
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0",
                )}
              >
                {banner.subhead}
              </p>
              <div
                className={cn(
                  "mt-8 flex flex-wrap items-center gap-4 transition-all delay-300 duration-700",
                  i === active
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0",
                )}
              >
                <Link href={banner.ctaHref} className="btn-gold">
                  {banner.ctaLabel}
                </Link>
                <Link
                  href="#featured-brands"
                  className="btn-outline border-bone/40 text-bone"
                >
                  Explore Brands
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Slide controls */}
      {banners.length > 1 ? (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}: ${banner.headline}`}
              aria-current={i === active}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === active ? "w-10 bg-gold" : "w-4 bg-bone/40 hover:bg-bone/70",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
