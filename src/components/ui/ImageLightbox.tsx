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
 *
 * Layout note: the close button sits in its own flex row *above* the photo,
 * not absolutely positioned over it. A square photo fills the whole viewport
 * on a phone, so an overlaid button ends up underneath the <img> and becomes
 * untappable — which left mobile visitors stuck in the viewer with no Escape
 * key to fall back on.
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
      className="fixed inset-0 z-[100] flex flex-col bg-ink/90"
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Full-size image"}
      onClick={onClose}
    >
      <div className="flex shrink-0 justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-bone transition hover:bg-white/20 active:bg-white/25"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10 sm:pb-10">
        <div
          className="relative mx-auto h-full w-full max-w-4xl"
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
    </div>
  );
}
