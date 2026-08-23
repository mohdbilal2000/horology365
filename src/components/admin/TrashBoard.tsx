"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import type { AdminModel } from "@/lib/types";

/**
 * Products removed from the storefront.
 *
 * Removal is a soft delete, and this page is the proof: everything ever removed
 * is still here with its images and variants intact, and one click puts it
 * back. Nothing in the app can empty this list.
 */
export function TrashBoard() {
  const [models, setModels] = useState<AdminModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products?includeDeleted=true", {
        cache: "no-store",
      });
      const data = (await res.json()) as { models?: AdminModel[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setModels(data.models ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load removed products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function restore(id: string) {
    setRestoring(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Restore failed.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed.");
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Removed products
        </h1>
        <p className="mt-1 max-w-2xl text-ink-500">
          Products you&rsquo;ve taken off the storefront. They keep their photos,
          variants and pricing, and can be put back at any time. Nothing here is
          ever erased — not by an update and not by a deploy.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="h-48 animate-pulse rounded-3xl bg-bone-300/60" />
      ) : models.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-bone-400 bg-bone-100 py-16 text-center">
          <p className="font-serif text-xl">Nothing removed</p>
          <p className="mt-2 text-sm text-ink-500">
            Every product you&rsquo;ve added is live on the storefront.
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm font-semibold text-gold-600 underline"
          >
            Back to inventory
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {models.map((model) => (
            <li
              key={model.id}
              className="flex items-center gap-4 rounded-2xl border border-bone-300 bg-bone-100 p-4 shadow-glass"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-bone-300">
                {model.imageUrl ? (
                  <Image
                    src={model.imageUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover opacity-70"
                    unoptimized
                  />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-lg font-bold tracking-tight">
                  {model.title}
                </p>
                <p className="text-xs text-ink-500">
                  {model.variants.length} variant
                  {model.variants.length === 1 ? "" : "s"} kept
                </p>
              </div>
              <span className="hidden text-sm font-semibold text-ink-500 sm:block">
                {formatINR(model.price)}
              </span>
              <button
                type="button"
                onClick={() => void restore(model.id)}
                disabled={restoring === model.id}
                className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-700 disabled:opacity-50"
              >
                {restoring === model.id ? "Restoring…" : "Restore"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
