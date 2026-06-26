"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    // Phase 1: client-only confirmation. Phase 2 posts to the mailing list.
    setError(null);
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-sm font-medium text-gold-300">
        You&apos;re on the list — watch your inbox for the next drop.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1.5 pl-4 backdrop-blur">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="Your email"
          aria-label="Email address"
          aria-invalid={Boolean(error)}
          className="h-9 min-w-0 flex-1 bg-transparent text-sm text-bone outline-none placeholder:text-bone/40"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-gold px-5 py-2 text-xs font-semibold text-ink transition hover:bg-gold-700"
        >
          Notify me
        </button>
      </div>
      <p className={cn("mt-2 text-xs", error ? "text-red-400" : "text-bone/45")}>
        {error ?? "Drop alerts and offers. No spam — unsubscribe anytime."}
      </p>
    </form>
  );
}
