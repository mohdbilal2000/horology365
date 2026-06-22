"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PriceTag } from "@/components/PriceTag";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface VideoProductCardProps {
  product: Product;
  brandName: string;
  className?: string;
}

/**
 * A muted autoplay loop tile for the video wall. The <video> uses
 * preload="none" + poster and only plays while it is in view (and the
 * user hasn't asked for reduced motion), keeping the page light.
 */
export function VideoProductCard({
  product,
  brandName,
  className,
}: VideoProductCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  const poster = product.videoPoster ?? product.images[0]?.url;

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setInView(entry.isIntersecting);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    if (inView) {
      node.play().catch(() => {
        /* Autoplay can be blocked; poster remains as fallback. */
      });
    } else {
      node.pause();
    }
  }, [inView]);

  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn("group relative block", className)}
      aria-label={`${brandName} ${product.title}`}
    >
      <div className="product-frame aspect-[3/4]">
        {product.videoUrl ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover transition-transform duration-500 ease-showroom group-hover:scale-105"
            src={product.videoUrl}
            poster={poster}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            tabIndex={-1}
          />
        ) : poster ? (
          <Image
            src={poster}
            alt={product.images[0]?.alt ?? product.title}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover"
          />
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4 text-bone">
          <span className="text-[11px] font-semibold uppercase tracking-label text-gold">
            {brandName}
          </span>
          <p className="mt-0.5 line-clamp-1 font-medium">{product.title}</p>
          <PriceTag
            price={product.price}
            mrp={product.mrp}
            size="sm"
            className="mt-1"
          />
        </div>
      </div>
    </Link>
  );
}
