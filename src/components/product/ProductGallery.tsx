"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/lib/types";

interface ProductGalleryProps {
  images: ProductImage[];
  title: string;
  videoUrl?: string;
  videoPoster?: string;
}

type Slide =
  | { kind: "video"; src: string; poster?: string }
  | { kind: "image"; image: ProductImage };

export function ProductGallery({
  images,
  title,
  videoUrl,
  videoPoster,
}: ProductGalleryProps) {
  const slides: Slide[] = [
    ...(videoUrl ? [{ kind: "video", src: videoUrl, poster: videoPoster } as const] : []),
    ...images.map((image) => ({ kind: "image", image }) as const),
  ];

  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const current = slides[active] ?? slides[0];
  if (!current) return null;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {/* Thumbnails */}
      {slides.length > 1 ? (
        <div
          className="no-scrollbar flex gap-3 overflow-x-auto sm:flex-col"
          role="tablist"
          aria-label={`${title} media`}
        >
          {slides.map((slide, i) => {
            const thumb =
              slide.kind === "video" ? slide.poster ?? images[0]?.url : slide.image.url;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={
                  slide.kind === "video"
                    ? `${title} video`
                    : slide.image.alt
                }
                onClick={() => setActive(i)}
                className={cn(
                  "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition",
                  i === active
                    ? "border-gold"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                {thumb ? (
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized={thumb.startsWith("data:")}
                  />
                ) : null}
                {slide.kind === "video" ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/35">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Main viewer */}
      {current.kind === "video" ? (
        <div className="product-frame aspect-square flex-1">
          <video
            className="h-full w-full object-cover"
            src={current.src}
            poster={current.poster}
            controls
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={`${title} in motion`}
          />
        </div>
      ) : (
        <div
          className="product-frame aspect-square flex-1 cursor-zoom-in"
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => setZoom(false)}
          onMouseMove={onMove}
        >
          <Image
            src={current.image.url}
            alt={current.image.alt}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 50vw"
            className={cn(
              "object-cover transition-transform duration-200 ease-out",
              zoom ? "scale-[1.8]" : "scale-100",
            )}
            style={zoom ? { transformOrigin: `${origin.x}% ${origin.y}%` } : undefined}
            unoptimized={current.image.url.startsWith("data:")}
          />
        </div>
      )}
    </div>
  );
}
