"use client";

import { useEffect, useState } from "react";

/**
 * Warns, on every admin page, when product storage is not connected.
 *
 * A client component asking /api/health at view time, deliberately: the admin
 * layout is prerendered, so checking the environment during render freezes the
 * answer at build time — a stale "not connected" banner over a working admin
 * (or worse, silence over a broken one) is exactly the failure this exists to
 * prevent. The health route is forced dynamic, so this answer is always live.
 *
 * Renders nothing while checking and nothing when healthy; the warning is the
 * only state with any UI. There is no "set it up" button here — Blob storage
 * has no schema to create, so the only real fix is setting
 * BLOB_READ_WRITE_TOKEN in the environment.
 */
export function DatabaseBanner() {
  const [down, setDown] = useState(false);
  const [detail, setDetail] = useState("");
  const [backups, setBackups] = useState<{ ok?: boolean; detail?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (d: {
          checks?: {
            storage?: { ok?: boolean; detail?: string };
            backups?: { ok?: boolean; detail?: string };
          };
        }) => {
          if (cancelled) return;
          setDown(d.checks?.storage?.ok === false);
          setDetail(d.checks?.storage?.detail ?? "");
          setBackups(d.checks?.backups ?? null);
        },
      )
      .catch(() => {
        // Can't reach our own health route: say nothing rather than guess.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Shown even when storage is fine. A shop whose backups stopped looks
  // perfectly healthy right up until the day it isn't, which is how this store
  // ended up with no copy of its catalogue at all, once already.
  const backupWarning =
    backups && backups.ok === false ? (
      <div
        role="alert"
        className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900"
      >
        No backup is being taken — your products are not protected.
        <span className="block font-normal">{backups.detail}</span>
      </div>
    ) : null;

  if (!down) return backupWarning;
  return (
    <>
      {backupWarning}
      <div
        role="alert"
        className="border-b border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-800"
      >
        Nothing can be saved right now — adding or editing products will not
        work, and the shop is showing the built-in catalogue.
        {detail ? <span className="block font-normal">{detail}</span> : null}
      </div>
    </>
  );
}
