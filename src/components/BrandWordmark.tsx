import { cn } from "@/lib/utils";

interface BrandWordmarkProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "text-sm",
  md: "text-lg sm:text-xl",
  lg: "text-2xl sm:text-3xl",
} as const;

/**
 * A reliable serif wordmark used in place of fetched brand logos (the old
 * logo CDN is gone, and real SVG logos arrive with the Phase 2 Storage
 * bucket). Reads as an intentional, premium typographic mark.
 */
export function BrandWordmark({ name, className, size = "md" }: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "inline-block max-w-full text-center font-serif font-semibold uppercase leading-tight tracking-[0.12em] break-words",
        SIZES[size],
        className,
      )}
    >
      {name}
    </span>
  );
}
