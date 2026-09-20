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
 * Distinct typographic treatment per logo-less brand, so its name reads as a
 * designed wordmark rather than plain text. Rendered in the site's own fonts
 * (crisp and identical on every device — unlike text baked into an SVG, which
 * falls back to whatever font the viewer happens to have). Official logo art
 * can replace any of these by dropping a file in /public/logos and setting the
 * brand's logoUrl.
 */
const BRAND_WORDMARK: Record<string, string> = {
  fastrack: "font-sans lowercase font-extrabold italic tracking-tight",
  "g-shock": "font-sans uppercase font-extrabold tracking-tight",
  sonata: "font-sans uppercase font-semibold tracking-[0.22em]",
  "carter-london": "font-serif uppercase font-light tracking-[0.28em]",
  "titan-raga": "font-serif uppercase italic font-medium tracking-[0.18em]",
};

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
    <BrandWordmark
      name={brand.name}
      size={wordmarkSize}
      className={cn(BRAND_WORDMARK[brand.slug], className)}
    />
  );
}
