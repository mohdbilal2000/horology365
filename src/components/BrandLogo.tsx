import { BrandWordmark } from "@/components/BrandWordmark";
import { cn } from "@/lib/utils";
import type { Brand } from "@/lib/types";

interface BrandLogoProps {
  brand: Brand;
  className?: string;
  /** Wordmark size used when the brand has no logo image. */
  wordmarkSize?: "sm" | "md" | "lg";
  /**
   * When true, logo-less brands render a compact monogram instead of the full
   * wordmark. Use inside small square tiles where a long name would overflow.
   */
  monogram?: boolean;
}

/** First letters of a brand name — "Fastrack" → "FA", "Carter London" → "CL", "G-Shock" → "GS". */
function monogramOf(name: string): string {
  const words = name.trim().split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Renders a brand's real logo image when available (self-hosted SVG/PNG),
 * falling back to a typographic wordmark (or a monogram in tight tiles). Logos
 * are monochrome-ish marks, so always place this on a light "plate" for
 * contrast.
 */
export function BrandLogo({
  brand,
  className,
  wordmarkSize = "sm",
  monogram = false,
}: BrandLogoProps) {
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
  if (monogram) {
    return (
      <span
        className={cn(
          "font-serif text-2xl font-bold uppercase leading-none tracking-[0.06em]",
          className,
        )}
      >
        {monogramOf(brand.name)}
      </span>
    );
  }
  return (
    <BrandWordmark name={brand.name} size={wordmarkSize} className={className} />
  );
}
