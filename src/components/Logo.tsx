import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** Tailwind height utility for the mark, e.g. "h-10". */
  className?: string;
  priority?: boolean;
}

/** Brand logo (self-hosted, transparent PNG) linking home. */
export function Logo({ className = "h-10", priority = false }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="Horology365 — home"
      className="inline-flex items-center"
    >
      <Image
        src="/brand/logo.png"
        alt="Horology365"
        width={420}
        height={339}
        priority={priority}
        className={cn("w-auto", className)}
      />
    </Link>
  );
}
