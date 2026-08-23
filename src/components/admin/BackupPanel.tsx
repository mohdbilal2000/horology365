"use client";

import { useRef, useState } from "react";

/**
 * Backup and restore.
 *
 * Deliberately plain: this is the page someone uses on the worst day, so it
 * says what each button does in words rather than assuming anything.
 */
export function BackupPanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"download" | "restore" | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  async function download() {
    setBusy("download");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/backup", { cache: "no-store" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `Request failed (${res.status})`);
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
      setMessage({ tone: "ok", text: "Backup downloaded. Keep it somewhere safe." });
    } catch (e) {
      setMessage({ tone: "bad", text: e instanceof Error ? e.message : "Backup failed." });
    } finally {
      setBusy(null);
    }
  }

  async function restore(file: File) {
    setBusy("restore");
    setMessage(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        result?: {
          productsRestored: number;
          productsSkipped: number;
          ordersRestored: number;
          ordersSkipped: number;
          errors: string[];
        };
      };
      if (!res.ok || !data.result) throw new Error(data.error ?? `Restore failed (${res.status})`);

      const r = data.result;
      setMessage({
        tone: "ok",
        text:
          `Put back ${r.productsRestored} product(s) and ${r.ordersRestored} order(s). ` +
          `${r.productsSkipped + r.ordersSkipped} were already here and were left untouched.` +
          (r.errors.length ? ` ${r.errors.length} item(s) could not be restored.` : ""),
      });
    } catch (e) {
      setMessage({ tone: "bad", text: e instanceof Error ? e.message : "Restore failed." });
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Backup</h1>
        <p className="mt-1 max-w-2xl text-ink-500">
          A copy of every product, order and change, saved to your own computer.
          Everything else protects your work inside the website — this protects it
          even if the website itself is gone.
        </p>
      </div>

      {message ? (
        <p
          role="status"
          className={
            message.tone === "ok"
              ? "rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800"
              : "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {message.text}
        </p>
      ) : null}

      <section className="rounded-3xl border border-bone-300 bg-bone-100 p-6 shadow-glass">
        <h2 className="font-serif text-xl">Download a backup</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-500">
          Saves one file containing every product (including removed ones), every
          order and the full change log. Do this before any big change.
        </p>
        <button
          type="button"
          onClick={() => void download()}
          disabled={busy !== null}
          className="btn-gold mt-4 disabled:opacity-60"
        >
          {busy === "download" ? "Preparing…" : "Download backup"}
        </button>
      </section>

      <section className="rounded-3xl border border-bone-300 bg-bone-100 p-6 shadow-glass">
        <h2 className="font-serif text-xl">Restore from a backup</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-500">
          Puts back anything that is missing. Products already here are{" "}
          <strong>never</strong> changed or overwritten, so this is always safe to
          run — worst case, nothing happens.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          disabled={busy !== null}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void restore(f);
          }}
          className="mt-4 block w-full max-w-md text-sm text-ink-600 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-bone hover:file:bg-ink/90"
        />
        {busy === "restore" ? (
          <p className="mt-3 text-sm text-ink-500">Restoring…</p>
        ) : null}
      </section>
    </div>
  );
}
