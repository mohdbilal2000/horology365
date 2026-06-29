"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("That password didn't work. Try again.");
        setBusy(false);
        return;
      }
      const next =
        new URL(window.location.href).searchParams.get("next") || "/admin";
      router.replace(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-bone-300 bg-bone-100 p-8 shadow-glass">
        <p className="text-xs font-semibold uppercase tracking-label text-ink-500">
          Horology<span className="text-gold">365</span> · Admin
        </p>
        <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Enter the admin password to manage inventory.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="admin-password"
              className="mb-1.5 block text-sm font-semibold text-ink-700"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-bone-300 bg-bone-100 px-4 py-2.5 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30 placeholder:text-ink-400"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || password.length === 0}
            className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
