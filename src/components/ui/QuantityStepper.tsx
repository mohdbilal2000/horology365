"use client";

import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  size = "md",
  className,
}: QuantityStepperProps) {
  const dim = size === "sm" ? "h-8 w-8 text-base" : "h-11 w-11 text-lg";
  const labelW = size === "sm" ? "w-8 text-sm" : "w-12 text-base";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-c-20",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "flex items-center justify-center rounded-full transition hover:text-gold disabled:opacity-30",
          dim,
        )}
      >
        −
      </button>
      <span
        className={cn("text-center font-semibold tabular-nums", labelW)}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          "flex items-center justify-center rounded-full transition hover:text-gold disabled:opacity-30",
          dim,
        )}
      >
        +
      </button>
    </div>
  );
}
