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
 *
 * The reason comes from /api/health rather than being written here. An earlier
 * version hardcoded "ask your developer to set DATABASE_URL", which was wrong
 * the moment the variable was set but the tables had not been created — it sent
 * the reader to fix something that was already fine while the real cause
 * ("relation \"products\" does not exist") sat unmentioned.
 */
export function DatabaseBanner() {
  const [down, setDown] = useState(false);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { checks?: { database?: { ok?: boolean; detail?: string } } }) => {
        if (cancelled) return;
        setDown(d.checks?.database?.ok === false);
        setDetail(d.checks?.database?.detail ?? "");
      })
      .catch(() => {
        // Can't reach our own health route: say nothing rather than guess.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // "connected, but empty" is a different problem from "no connection string",
  // and it is one the app can fix itself — so offer the fix here rather than
  // sending the owner to a database console with a file of SQL.
  const needsTables = /does not exist/i.test(detail);

  async function createTables() {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/setup-db", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult(`Done — ${data.protections} of ${data.expected} protections installed. Reloading…`);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setResult(data.error ?? "Could not set up the database.");
      }
    } catch {
      setResult("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!down) return null;
  return (
    <div
      role="alert"
      className="border-b border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-800"
    >
      Nothing can be saved right now — adding or editing products will not
      work, and the shop is showing the built-in catalogue.
      {detail ? <span className="block font-normal">{detail}</span> : null}
      {needsTables ? (
        <span className="mt-2 block">
          <button
            type="button"
            onClick={createTables}
            disabled={busy}
            className="rounded-full bg-red-800 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
          >
            {busy ? "Setting up…" : "Set up the database"}
          </button>
          <span className="ml-3 font-normal">
            {result || "Creates the tables and the protections. Adds nothing, deletes nothing."}
          </span>
        </span>
      ) : null}
    </div>
  );
}
