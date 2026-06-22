import Link from "next/link";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** Small uppercase letter-spaced eyebrow label. */
  label: string;
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  label,
  title,
  viewAllHref,
  viewAllLabel = "View all",
  className,
  align = "left",
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className,
      )}
    >
      <div className={cn(align === "center" && "sm:items-center")}>
        <span className="eyebrow">{label}</span>
        <h2 className="display-title mt-2 text-balance">{title}</h2>
      </div>
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gold transition hover:text-gold-300"
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
