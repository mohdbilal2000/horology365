"use client";

import { useRef, useState } from "react";

/**
 * Backups, restores, and the one-time clear-out of the demo watches.
 *
 * Grouped on their own page rather than beside the day-to-day inventory
 * controls: two of these three actions delete or overwrite stock, and they
 * shouldn't sit a mis-tap away from "edit product".
 */
export function DataSafetyPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function reset() {
    setError(null);
    setNotice(null);
  }

  async function download() {
    reset();
    setBusy("backup");
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Backup failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `horology365-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice("Backup downloaded. Keep it somewhere safe — not only on this phone.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed.");
    } finally {
      setBusy(null);
    }
  }

  async function restore(file: File) {
    reset();
    setBusy("restore");
    try {
      const text = await file.text();
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Restore failed.");
      const { products, brands } = data.restored ?? {};
      setNotice(`Restored ${products ?? 0} products and ${brands ?? 0} brands.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed.");
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function clearDemo() {
    reset();
    const ok = window.confirm(
      "Remove all built-in demo watches?\n\nProducts you added yourself are NOT affected. This can't be undone — download a backup first if you're unsure.",
    );
    if (!ok) return;

    setBusy("demo");
    try {
      const res = await fetch("/api/admin/products/demo", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't remove demo products.");
      setNotice(`Removed ${data.removed} demo watches. The shop is yours now.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove demo products.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="font-serif text-2xl font-bold">Data &amp; safety</h1>
        <p className="mt-1 text-sm text-ink-500">
          Your products, photos and prices live in the database. A backup is
          the only copy that survives losing access to it.
        </p>
      </header>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-2xl bg-gold-50 px-4 py-3 text-sm text-ink">{notice}</p>
      ) : null}

      <div className="rounded-3xl border border-bone-300 bg-bone-100 p-5">
        <h2 className="font-semibold">Download a backup</h2>
        <p className="mt-1 text-sm text-ink-500">
          Saves every brand, category and product to a file on your device.
          Do this after any big stock update.
        </p>
        <button
          type="button"
          onClick={download}
          disabled={busy !== null}
          className="mt-3 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-gold transition hover:brightness-105 disabled:opacity-50"
        >
          {busy === "backup" ? "Preparing…" : "Download backup"}
        </button>
      </div>

      <div className="rounded-3xl border border-bone-300 bg-bone-100 p-5">
        <h2 className="font-semibold">Restore from a backup</h2>
        <p className="mt-1 text-sm text-ink-500">
          Puts a backup file back into the shop. Existing products stay —
          nothing is deleted, matching items are updated.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          disabled={busy !== null}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void restore(file);
          }}
          className="mt-3 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-bone-100"
        />
        {busy === "restore" ? (
          <p className="mt-2 text-sm text-ink-500">Restoring…</p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-red-300 bg-red-50/60 p-5">
        <h2 className="font-semibold text-red-900">Clear the demo watches</h2>
        <p className="mt-1 text-sm text-red-800/80">
          Removes the sample watches the site ships with, so the shop shows
          only your real stock. Your own products are never touched.
        </p>
        <button
          type="button"
          onClick={clearDemo}
          disabled={busy !== null}
          className="mt-3 rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
        >
          {busy === "demo" ? "Removing…" : "Remove demo watches"}
        </button>
      </div>
    </section>
  );
}
