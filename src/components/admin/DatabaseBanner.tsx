"use client";

import { useEffect, useState } from "react";

/**
 * Warns, on every admin page, when the database is not connected.
 *
 * A client component asking /api/health at view time, deliberately: the admin
 * layout is prerendered, so checking the environment during render freezes the
 * answer at build time — a stale "not connected" banner over a working admin
 * (or worse, silence over a broken one) is exactly the failure this exists to
 * prevent. The health route is forced dynamic, so this answer is always live.
 *
 * Renders nothing while checking and nothing when healthy; the warning is the
 * only state with any UI.
 */
export function DatabaseBanner() {
  const [down, setDown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { checks?: { database?: { ok?: boolean } } }) => {
        if (!cancelled) setDown(d.checks?.database?.ok === false);
      })
      .catch(() => {
        // Can't reach our own health route: say nothing rather than guess.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!down) return null;
  return (
    <div
      role="alert"
      className="border-b border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-800"
    >
      The product database is not connected, so nothing can be saved right now —
      adding or editing products will not work. The shop still shows the
      built-in catalogue. Ask your developer to set DATABASE_URL (see
      DATABASE.md in the project).
    </div>
  );
}
