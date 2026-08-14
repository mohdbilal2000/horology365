"use client";

import { useEffect } from "react";
import Image from "next/image";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * Full-image viewer — shows the whole photo, uncropped, at the largest size
 * that fits the viewport. Used wherever a user wants to inspect a photo
 * closely instead of the magnify-on-hover crop that used to hide the edges.
 */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4 sm:p-10"
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Full-size image"}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-bone transition hover:bg-white/20"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div
        className="relative h-full w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          className="object-contain"
          unoptimized={src.startsWith("data:")}
        />
      </div>
    </div>
  );
}
