"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
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
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const current = slides[active] ?? slides[0];
  if (!current) return null;

  return (
    // On desktop the thumbnail rail is pinned to the viewer's height (absolute
    // inside a stretched grid cell) so 4-5 photos scroll inside the rail
    // instead of stretching the gallery taller than the image — which used to
    // leave a blank gap under the viewer.
    // `min-w-0` matters: this sits in a grid cell whose automatic minimum size
    // is its min-content width. The thumbnail rail is 5x80px + gaps = 448px,
    // so a product with 5+ photos used to push the whole page wider than a
    // phone screen — the browser then shrink-to-fit the entire layout and the
    // header stopped reaching the right edge. Clamping here lets the rail
    // scroll horizontally, as intended, instead of stretching the page.
    <div
      className={cn(
        "flex min-w-0 flex-col-reverse gap-4",
        slides.length > 1 && "sm:grid sm:grid-cols-[5rem_minmax(0,1fr)]",
      )}
    >
      {/* Thumbnails */}
      {slides.length > 1 ? (
        <div className="relative min-w-0 sm:min-h-0">
          <div
            className="no-scrollbar flex gap-3 overflow-x-auto sm:absolute sm:inset-0 sm:flex-col sm:overflow-y-auto"
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
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`View ${current.image.alt} full-size`}
          className="product-frame group relative aspect-square flex-1 cursor-zoom-in"
        >
          <Image
            src={current.image.url}
            alt={current.image.alt}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-contain"
            unoptimized={current.image.url.startsWith("data:")}
          />
          {/* Always shown on touch screens — there is no hover there, so the
              hint was invisible and nobody knew the photo could be opened. */}
          <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-xs font-semibold text-bone opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" />
            </svg>
            View full photo
          </span>
        </button>
      )}

      {lightboxOpen && current.kind === "image" ? (
        <ImageLightbox
          src={current.image.url}
          alt={current.image.alt}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  );
}
