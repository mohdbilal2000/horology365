import { cn } from "@/lib/utils";
import { discountPercent, formatINR } from "@/lib/utils";

interface PriceTagProps {
  price: number;
  mrp: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Render the % off as a gold pill rather than inline text. */
  badge?: boolean;
}

const SIZES = {
  sm: { price: "text-base", mrp: "text-xs", off: "text-xs" },
  md: { price: "text-lg", mrp: "text-sm", off: "text-xs" },
  lg: { price: "text-3xl", mrp: "text-base", off: "text-sm" },
} as const;

export function PriceTag({
  price,
  mrp,
  size = "md",
  className,
  badge = false,
}: PriceTagProps) {
  const off = discountPercent(mrp, price);
  const s = SIZES[size];

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={cn("font-semibold tracking-tight", s.price)}>
        {formatINR(price)}
      </span>
      {off > 0 ? (
        <>
          <span className={cn("text-c-50 line-through", s.mrp)}>
            {formatINR(mrp)}
          </span>
          {badge ? (
            <span
              className={cn(
                "rounded-full bg-gold px-2 py-0.5 font-bold text-ink",
                s.off,
              )}
            >
              {off}% OFF
            </span>
          ) : (
            <span className={cn("font-bold text-gold", s.off)}>{off}% off</span>
          )}
        </>
      ) : null}
    </div>
  );
}
