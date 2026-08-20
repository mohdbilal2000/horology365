"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AdminBrand {
  slug: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

/**
 * Showcase order and visibility for every brand.
 *
 * Position is edited by moving a brand up or down rather than by typing a
 * number: the list is the running order, so "Casio first, Timex third" is a
 * thing you arrange, not a set of numbers to keep consistent by hand. Numbers
 * are re-derived from the final order on save, which also repairs any ties or
 * gaps left by earlier edits.
 */
export function BrandOrderBoard() {
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/brands");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't load brands.");
      setBrands(data.brands ?? []);
      setError(null);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load brands.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= brands.length) return;
    const moving = brands[index];
    const displaced = brands[target];
    if (!moving || !displaced) return;
    const next = [...brands];
    next[index] = displaced;
    next[target] = moving;
    setBrands(next);
    setDirty(true);
    setNotice(null);
  }

  function toggle(index: number) {
    const current = brands[index];
    if (!current) return;
    const next = [...brands];
    next[index] = { ...current, is_active: !current.is_active };
    setBrands(next);
    setDirty(true);
    setNotice(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/brands", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brands: brands.map((b, i) => ({
            slug: b.slug,
            sortOrder: i + 1,
            isActive: b.is_active,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save.");
      setNotice("Saved. The storefront updates within a minute.");
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-bone-300/60" />;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">Brand showcase</h1>
          <p className="mt-1 text-sm text-ink-500">
            Top of this list shows first on the storefront. Hidden brands
            disappear everywhere, along with their watches.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className={cn(
            "rounded-full px-5 py-2.5 text-sm font-semibold transition",
            dirty && !saving
              ? "bg-gold text-ink shadow-gold hover:brightness-105"
              : "cursor-not-allowed bg-bone-300 text-ink-500",
          )}
        >
          {saving ? "Saving…" : dirty ? "Save order" : "Saved"}
        </button>
      </header>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-2xl bg-gold-50 px-4 py-3 text-sm text-ink">{notice}</p>
      ) : null}

      <ol className="space-y-2">
        {brands.map((brand, i) => (
          <li
            key={brand.slug}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3",
              brand.is_active
                ? "border-bone-300 bg-bone-100"
                : "border-bone-300 bg-bone-200/60 opacity-60",
            )}
          >
            <span className="w-7 shrink-0 text-center font-mono text-sm text-ink-500">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{brand.name}</span>

            <button
              type="button"
              onClick={() => toggle(i)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-bone-300"
            >
              {brand.is_active ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Move ${brand.name} up`}
              className="rounded-full px-2.5 py-1.5 text-sm transition hover:bg-bone-300 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === brands.length - 1}
              aria-label={`Move ${brand.name} down`}
              className="rounded-full px-2.5 py-1.5 text-sm transition hover:bg-bone-300 disabled:opacity-30"
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
