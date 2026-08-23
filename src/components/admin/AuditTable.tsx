"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/lib/admin/audit";

/** Colour-codes the action so destructive-looking events stand out. */
const ACTION_STYLES: Record<string, string> = {
  "model.create": "bg-green-100 text-green-800",
  "model.update": "bg-blue-100 text-blue-800",
  "model.delete": "bg-amber-100 text-amber-900",
  "model.restore": "bg-green-100 text-green-800",
  "stock.adjust": "bg-bone-300 text-ink-700",
  "variant.delivery": "bg-gold/25 text-ink",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-bone-400 bg-bone-100 py-16 text-center">
        <p className="font-serif text-xl">No changes recorded yet</p>
        <p className="mt-2 text-sm text-ink-500">
          Add or edit a product and it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-bone-300 bg-bone-100 shadow-glass">
      <ul className="divide-y divide-bone-300">
        {entries.map((entry) => {
          const open = expanded === entry.id;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : entry.id)}
                aria-expanded={open}
                className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition hover:bg-bone-200/60 sm:px-5"
              >
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-label",
                    ACTION_STYLES[entry.action] ?? "bg-bone-300 text-ink-700",
                  )}
                >
                  {entry.action.replace(".", " ")}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {entry.summary}
                </span>
                <span className="text-xs text-ink-500">{formatWhen(entry.at)}</span>
                <span className="text-xs text-ink-400">{entry.actor}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-ink-400 transition-transform",
                    open && "rotate-180",
                  )}
                >
                  ▾
                </span>
              </button>

              {open ? (
                <div className="grid gap-4 border-t border-bone-300 bg-bone-200/50 p-4 sm:grid-cols-2 sm:px-5">
                  <StateBlock label="Before" value={entry.before} />
                  <StateBlock label="After" value={entry.after} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StateBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-label text-ink-500">
        {label}
      </p>
      <pre className="max-h-64 overflow-auto rounded-xl bg-ink/95 p-3 font-mono text-[11px] leading-relaxed text-bone">
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
