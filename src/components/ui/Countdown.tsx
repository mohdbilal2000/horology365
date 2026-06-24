"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CountdownProps {
  /** ISO date string for the drop. */
  target: string;
  className?: string;
  tone?: "light" | "dark";
}

function diff(targetMs: number) {
  const now = Date.now();
  const d = Math.max(0, targetMs - now);
  return {
    done: d <= 0,
    days: Math.floor(d / 86400000),
    hours: Math.floor((d % 86400000) / 3600000),
    mins: Math.floor((d % 3600000) / 60000),
    secs: Math.floor((d % 60000) / 1000),
  };
}

/** Live "drops in" countdown. Renders nothing on the server to avoid mismatch. */
export function Countdown({ target, className, tone = "dark" }: CountdownProps) {
  const targetMs = new Date(target).getTime();
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    if (Number.isNaN(targetMs)) return;
    setT(diff(targetMs));
    const id = window.setInterval(() => setT(diff(targetMs)), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  if (!t || t.done) return null;

  const units = [
    { v: t.days, l: "days" },
    { v: t.hours, l: "hrs" },
    { v: t.mins, l: "min" },
    { v: t.secs, l: "sec" },
  ];

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="timer"
      aria-label={`Drops in ${t.days} days ${t.hours} hours`}
    >
      {units.map((u, i) => (
        <span key={u.l} className="flex items-center gap-1.5">
          <span
            className={cn(
              "flex min-w-[2.6rem] flex-col items-center rounded-lg px-2 py-1.5",
              tone === "dark" ? "bg-white/10" : "bg-ink/5",
            )}
          >
            <span className="font-serif text-base font-bold tabular-nums leading-none">
              {String(u.v).padStart(2, "0")}
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-60">
              {u.l}
            </span>
          </span>
          {i < units.length - 1 ? (
            <span className="text-xs opacity-40">:</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
