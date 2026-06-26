import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  className?: string;
  size?: "sm" | "md";
}

export function StarRating({
  rating,
  reviewCount,
  className,
  size = "sm",
}: StarRatingProps) {
  const rounded = Math.round(rating * 2) / 2;
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`Rated ${rating} out of 5${
        reviewCount ? ` from ${reviewCount} reviews` : ""
      }`}
    >
      <div className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill =
            rounded >= i ? "full" : rounded >= i - 0.5 ? "half" : "empty";
          return (
            <svg
              key={i}
              viewBox="0 0 20 20"
              className={cn(dim, "shrink-0")}
              fill="none"
            >
              <defs>
                <linearGradient id={`half-${i}`}>
                  <stop offset="50%" stopColor="#C9A24A" />
                  <stop offset="50%" stopColor="currentColor" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <path
                d="M10 1.5l2.6 5.3 5.9.86-4.25 4.14 1 5.86L10 15.9l-5.25 2.76 1-5.86L1.5 7.66l5.9-.86L10 1.5z"
                fill={
                  fill === "full"
                    ? "#C9A24A"
                    : fill === "half"
                      ? `url(#half-${i})`
                      : "currentColor"
                }
                fillOpacity={fill === "empty" ? 0.2 : 1}
              />
            </svg>
          );
        })}
      </div>
      {reviewCount !== undefined ? (
        <span className="text-xs text-c-60">({reviewCount})</span>
      ) : null}
    </div>
  );
}
