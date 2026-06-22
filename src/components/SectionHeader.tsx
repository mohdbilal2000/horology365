import Link from "next/link";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** Small uppercase letter-spaced eyebrow label. */
  label: string;
  title: string;
  /** Optional supporting line under the title. */
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  label,
  title,
  description,
  viewAllHref,
  viewAllLabel = "View all",
  className,
  align = "left",
}: SectionHeaderProps) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "mb-10 sm:mb-12",
        centered
          ? "flex flex-col items-center text-center"
          : "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "flex flex-col items-center")}>
        <span className="eyebrow inline-flex items-center gap-2">
          <span className="h-px w-6 bg-gold" aria-hidden="true" />
          {label}
        </span>
        <h2 className="t-h2 mt-3">{title}</h2>
        {description ? (
          <p className="t-lead mt-3 text-c-60">{description}</p>
        ) : null}
      </div>
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className={cn(
            "group inline-flex shrink-0 items-center gap-2 rounded-full border border-c-20 px-4 py-2 text-sm font-semibold tracking-wide transition hover:border-gold hover:text-gold",
            centered && "mt-6",
          )}
        >
          {viewAllLabel}
          <span
            aria-hidden="true"
            className="transition-transform duration-300 ease-showroom group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}
