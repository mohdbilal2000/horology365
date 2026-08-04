"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

type SearchResult = Product & { brandName: string };

const SUGGESTED = ["G-Shock", "Titan Raga", "Smartwatch", "Rose Gold", "Diver"];

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .catch(() => {});
    }, 150);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const focus = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.clearTimeout(focus);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Search watches"
    >
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative mt-[8vh] w-full max-w-2xl animate-fade-up overflow-hidden rounded-2xl bg-bone-100 shadow-product-hover">
        <div className="flex items-center gap-3 border-b border-bone-300 px-5">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-500" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brands, watches, styles…"
            className="h-14 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-500"
            aria-label="Search query"
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm font-medium text-ink-500 hover:text-ink"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() === "" ? (
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-label text-ink-500">
                Popular searches
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTED.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="rounded-full border border-bone-300 px-3 py-1.5 text-sm transition hover:border-gold hover:text-gold"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-500">
              No watches match “{query}”. Try a brand name or style.
            </p>
          ) : (
            <ul>
              {results.map((product) => {
                const cover = product.images[0];
                return (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-4 rounded-xl p-2.5 transition hover:bg-bone-200"
                    >
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-bone-300">
                        {cover ? (
                          <Image
                            src={cover.url}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-label text-ink-500">
                          {product.brandName}
                        </span>
                        <span className="block truncate font-medium">
                          {product.title}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold">
                        {formatINR(product.price)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
