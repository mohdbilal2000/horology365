"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/lib/types";

interface ProductGalleryProps {
  images: ProductImage[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const current = images[active] ?? images[0];
  if (!current) return null;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
  }

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {/* Thumbnails */}
      {images.length > 1 ? (
        <div
          className="no-scrollbar flex gap-3 overflow-x-auto sm:flex-col"
          role="tablist"
          aria-label={`${title} images`}
        >
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={image.alt}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition",
                i === active
                  ? "border-gold"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {/* Main image with hover-zoom */}
      <div
        className="product-frame aspect-square flex-1 cursor-zoom-in"
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={onMove}
      >
        <Image
          src={current.url}
          alt={current.alt}
          fill
          priority
          sizes="(max-width: 640px) 100vw, 50vw"
          className={cn(
            "object-cover transition-transform duration-200 ease-out",
            zoom ? "scale-[1.8]" : "scale-100",
          )}
          style={zoom ? { transformOrigin: `${origin.x}% ${origin.y}%` } : undefined}
        />
      </div>
    </div>
  );
}
