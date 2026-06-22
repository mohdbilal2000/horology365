import { BrandWordmark } from "@/components/BrandWordmark";
import { cn } from "@/lib/utils";
import type { Brand } from "@/lib/types";

interface BrandLogoProps {
  brand: Brand;
  className?: string;
  /** Wordmark size used when the brand has no logo image. */
  wordmarkSize?: "sm" | "md" | "lg";
}

/**
 * Renders a brand's real logo image when available (self-hosted SVG/PNG),
 * falling back to a typographic wordmark. Logos are monochrome-ish marks, so
 * always place this on a light "plate" for contrast.
 */
export function BrandLogo({ brand, className, wordmarkSize = "sm" }: BrandLogoProps) {
  if (brand.logoUrl) {
    return (
      // Static, same-origin asset of unknown intrinsic ratio — a plain <img>
      // with object-contain is the right tool here, not next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logoUrl}
        alt={`${brand.name} logo`}
        loading="lazy"
        decoding="async"
        className={cn("max-h-full max-w-full object-contain", className)}
      />
    );
  }
  return <BrandWordmark name={brand.name} size={wordmarkSize} className={className} />;
}
