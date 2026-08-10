"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ProductBuilder } from "@/components/admin/ProductBuilder";
import type { AdminModel } from "@/lib/types";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [model, setModel] = useState<AdminModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/products/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load product.");
        if (!cancelled) setModel(data.model as AdminModel);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load product.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-3xl bg-bone-300/60" />;
  }

  if (error || !model) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-bone-400 bg-bone-100 py-16 text-center">
        <p className="font-serif text-xl">Couldn&apos;t open this product</p>
        <p className="max-w-sm text-sm text-ink-500">
          {error ?? "It may have been deleted."}
        </p>
        <Link href="/admin" className="btn-gold">
          Back to inventory
        </Link>
      </div>
    );
  }

  return <ProductBuilder initial={model} />;
}
