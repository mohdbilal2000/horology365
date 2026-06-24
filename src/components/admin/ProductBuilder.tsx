"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCatalogStore } from "@/lib/store/catalog";
import { activeBrands, getBrandBySlug } from "@/lib/mock/brands";
import { categories } from "@/lib/mock/categories";
import { BrandLogo } from "@/components/BrandLogo";
import { discountPercent, formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AdminModel, CategorySlug, Variant } from "@/lib/types";

let uidN = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${uidN++}`;

const STEPS = ["Brand", "Model", "Variants", "Review"] as const;

function blankVariant(): Variant {
  return {
    id: uid("v"),
    name: "",
    colorHex: "#1A1A1A",
    sku: "",
    availability: "in_stock",
    stockQty: 10,
    preorderTarget: 50,
    preorderReserved: 0,
    dropDate: "",
  };
}

export function ProductBuilder() {
  const router = useRouter();
  const addModel = useCatalogStore((s) => s.addModel);

  const [step, setStep] = useState(0);
  const [brandSlug, setBrandSlug] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState<CategorySlug>("mens-watches");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [variants, setVariants] = useState<Variant[]>([blankVariant()]);
  const [error, setError] = useState<string | null>(null);

  const effectiveBrand = brandSlug || (newBrand.trim() ? "new" : "");
  const brandName =
    brandSlug ? getBrandBySlug(brandSlug)?.name ?? brandSlug : newBrand.trim();
  const priceN = Number(price) || 0;
  const mrpN = Number(mrp) || 0;
  const off = discountPercent(mrpN, priceN);

  const previewImage =
    imageUrl.trim() ||
    "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=70";

  function updateVariant(id: string, patch: Partial<Variant>) {
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function validateStep(s: number): string | null {
    if (s === 0 && !effectiveBrand) return "Pick a brand or add a new one.";
    if (s === 1) {
      if (title.trim().length < 2) return "Enter a model name.";
      if (priceN <= 0) return "Enter a selling price.";
      if (mrpN < priceN) return "MRP can't be lower than the price.";
    }
    if (s === 2) {
      if (variants.length === 0) return "Add at least one variant.";
      if (variants.some((v) => v.name.trim().length < 1))
        return "Every variant needs a name.";
    }
    return null;
  }

  function next() {
    const e = validateStep(step);
    if (e) {
      setError(e);
      return;
    }
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function publish() {
    for (let s = 0; s < 3; s++) {
      const e = validateStep(s);
      if (e) {
        setError(e);
        setStep(s);
        return;
      }
    }
    const slug = brandSlug || newBrand.trim().toLowerCase().replace(/\s+/g, "-");
    const model: AdminModel = {
      id: uid("m"),
      brandSlug: slug,
      title: title.trim(),
      categorySlug,
      description: description.trim(),
      price: priceN,
      mrp: mrpN,
      imageUrl: previewImage,
      variants: variants.map((v, i) => ({
        ...v,
        name: v.name.trim(),
        sku:
          v.sku.trim() ||
          `H365-${title.trim().slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, "0")}`,
      })),
      createdAt: new Date().toISOString(),
    };
    addModel(model);
    router.push("/admin");
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        Add a product
      </h1>
      <p className="mt-1 text-ink-500">
        Brand, model, then the variants you actually stock — see it build live.
      </p>

      {/* Stepper */}
      <ol className="mt-7 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                i === step
                  ? "bg-gold text-white"
                  : i < step
                    ? "text-gold"
                    : "text-ink-400",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  i === step
                    ? "bg-white/25"
                    : i < step
                      ? "bg-gold/15"
                      : "bg-bone-300",
                )}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 ? (
              <span className="h-px flex-1 bg-bone-300" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* ── Form ── */}
        <div className="rounded-3xl border border-bone-300 bg-bone-100 p-6 shadow-glass sm:p-8">
          {step === 0 ? (
            <Field label="Brand">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {activeBrands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBrandSlug(b.slug);
                      setNewBrand("");
                    }}
                    className={cn(
                      "flex h-16 items-center justify-center rounded-xl border bg-bone-100 p-3 transition",
                      brandSlug === b.slug
                        ? "border-gold ring-2 ring-gold/30"
                        : "border-bone-300 hover:border-gold",
                    )}
                  >
                    <BrandLogo brand={b} wordmarkSize="sm" className="max-h-8 text-ink" />
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-ink-600">
                  …or add a new brand
                </label>
                <input
                  value={newBrand}
                  onChange={(e) => {
                    setNewBrand(e.target.value);
                    if (e.target.value) setBrandSlug("");
                  }}
                  placeholder="New brand name"
                  className={inputCls}
                />
              </div>
            </Field>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <Field label="Model name">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. G-Shock GA-2100"
                  className={inputCls}
                />
              </Field>
              <Field label="Category">
                <div className="flex gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategorySlug(c.slug)}
                      className={cn(
                        "flex-1 rounded-xl border py-2.5 text-sm font-semibold transition",
                        categorySlug === c.slug
                          ? "border-gold bg-gold/5 text-gold-700"
                          : "border-bone-300 hover:border-gold",
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Selling price (₹)">
                  <input
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                    placeholder="9995"
                    className={inputCls}
                  />
                </Field>
                <Field label="MRP (₹)">
                  <input
                    inputMode="numeric"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value.replace(/\D/g, ""))}
                    placeholder="12995"
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Image URL">
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…/watch.jpg"
                  className={inputCls}
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short, punchy description…"
                  className={cn(inputCls, "resize-y")}
                />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              {variants.map((v, i) => (
                <VariantEditor
                  key={v.id}
                  index={i}
                  variant={v}
                  canRemove={variants.length > 1}
                  onChange={(patch) => updateVariant(v.id, patch)}
                  onRemove={() =>
                    setVariants((vs) => vs.filter((x) => x.id !== v.id))
                  }
                />
              ))}
              <button
                type="button"
                onClick={() => setVariants((vs) => [...vs, blankVariant()])}
                className="w-full rounded-xl border border-dashed border-bone-400 py-3 text-sm font-semibold text-ink-600 transition hover:border-gold hover:text-gold"
              >
                + Add another variant
              </button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-600">
                Looks good? Publishing adds <strong>{title || "this model"}</strong>{" "}
                with <strong>{variants.length}</strong> variant
                {variants.length === 1 ? "" : "s"} to your catalogue.
              </p>
              <ul className="divide-y divide-bone-300 rounded-2xl border border-bone-300">
                {variants.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 p-3 text-sm">
                    <span
                      className="h-5 w-5 rounded-full ring-1 ring-bone-400"
                      style={{ backgroundColor: v.colorHex }}
                    />
                    <span className="font-medium">{v.name || "Unnamed"}</span>
                    <span className="ml-auto text-ink-500">
                      {v.availability === "preorder"
                        ? `Pre-order · target ${v.preorderTarget}`
                        : `${v.stockQty} in stock`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink-500 transition enabled:hover:text-ink disabled:opacity-30"
            >
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={next} className="btn-gold">
                Continue
              </button>
            ) : (
              <button type="button" onClick={publish} className="btn-gold">
                Publish product
              </button>
            )}
          </div>
        </div>

        {/* ── Live preview ── */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <p className="mb-3 text-xs font-semibold uppercase tracking-label text-ink-500">
            Live preview
          </p>
          <div className="overflow-hidden rounded-2xl border border-bone-300 bg-bone-100 shadow-product">
            <div className="relative aspect-square bg-bone-300/50">
              <Image
                src={previewImage}
                alt=""
                fill
                sizes="340px"
                className="object-cover"
                unoptimized
              />
              {off > 0 ? (
                <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-white">
                  {off}% OFF
                </span>
              ) : null}
            </div>
            <div className="p-4">
              <span className="text-[11px] font-semibold uppercase tracking-label text-ink-500">
                {brandName || "Brand"}
              </span>
              <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug">
                {title || "Model name"}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-semibold">
                  {priceN ? formatINR(priceN) : "₹—"}
                </span>
                {off > 0 ? (
                  <span className="text-sm text-ink-400 line-through">
                    {formatINR(mrpN)}
                  </span>
                ) : null}
              </div>
              {variants.some((v) => v.name) ? (
                <div className="mt-3 flex items-center gap-1.5">
                  {variants.map((v) => (
                    <span
                      key={v.id}
                      title={v.name}
                      className="h-5 w-5 rounded-full ring-1 ring-bone-400"
                      style={{ backgroundColor: v.colorHex }}
                    />
                  ))}
                  <span className="ml-1 text-xs text-ink-500">
                    {variants.length} colour{variants.length === 1 ? "" : "s"}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-bone-300 bg-bone-100 px-4 py-2.5 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30 placeholder:text-ink-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</label>
      {children}
    </div>
  );
}

function VariantEditor({
  index,
  variant: v,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  variant: Variant;
  canRemove: boolean;
  onChange: (patch: Partial<Variant>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-bone-300 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-600">
          Variant {index + 1}
        </span>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-medium text-ink-400 transition hover:text-red-600"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-3">
        <input
          type="color"
          aria-label="Variant colour"
          value={v.colorHex}
          onChange={(e) => onChange({ colorHex: e.target.value })}
          className="h-10 w-12 cursor-pointer rounded-lg border border-bone-300 bg-bone-100"
        />
        <input
          value={v.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Colourway, e.g. Matte Black"
          className={inputCls}
        />
      </div>

      {/* Availability toggle */}
      <div className="mt-3 inline-flex rounded-full border border-bone-300 p-0.5 text-sm">
        {(["in_stock", "preorder"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange({ availability: a })}
            className={cn(
              "rounded-full px-4 py-1.5 font-semibold transition",
              v.availability === a ? "bg-gold text-white" : "text-ink-500",
            )}
          >
            {a === "in_stock" ? "In stock" : "Pre-order"}
          </button>
        ))}
      </div>

      {v.availability === "in_stock" ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm text-ink-600">Quantity in stock</span>
          <input
            inputMode="numeric"
            value={String(v.stockQty)}
            onChange={(e) =>
              onChange({ stockQty: Number(e.target.value.replace(/\D/g, "")) || 0 })
            }
            className={cn(inputCls, "w-24")}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600">
              Pre-order batch size
            </label>
            <input
              inputMode="numeric"
              value={String(v.preorderTarget)}
              onChange={(e) =>
                onChange({
                  preorderTarget: Number(e.target.value.replace(/\D/g, "")) || 0,
                })
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600">
              Expected drop date
            </label>
            <input
              type="date"
              value={v.dropDate ?? ""}
              onChange={(e) => onChange({ dropDate: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      )}
    </div>
  );
}
