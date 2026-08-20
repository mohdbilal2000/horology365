"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { activeBrands, getBrandBySlug } from "@/lib/mock/brands";
import { getModelsForBrand } from "@/lib/mock/modelCatalog";
import { categories } from "@/lib/mock/categories";
import { discountPercent, formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AdminModel, CategorySlug, Variant } from "@/lib/types";

let uidN = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${uidN++}`;

const STEPS = ["Brand", "Model", "Variants", "Review"] as const;
const CUSTOM = "__custom__";
const NEW_BRAND = "__new__";
const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=70";

/** Longest edge of a stored photo, in px. */
const MAX_EDGE = 1200;

/**
 * Read a picked file and letterbox it onto a square canvas on white.
 *
 * Product frames across the site are square (or 4:3), and a non-square photo
 * dropped into one gets visually cropped by `object-cover` — which is exactly
 * the "photo crops itself after upload" the client hit. Padding to a square
 * here means the whole photo survives every frame it lands in, uncropped. The
 * canvas step also downscales, keeping the stored data URL small.
 */
async function fileToSquareDataUrl(file: File, quality = 0.85): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new window.Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = raw;
    });
    const longest = Math.max(img.width, img.height);
    const scale = Math.min(1, MAX_EDGE / longest);
    const size = Math.round(longest * scale);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;
    // White backdrop so the padding reads as studio background, not a hole.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, Math.round((size - w) / 2), Math.round((size - h) / 2), w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return raw;
  }
}

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

interface ProductBuilderProps {
  /** Present when editing an existing product; absent when adding a new one. */
  initial?: AdminModel;
}

export function ProductBuilder({ initial }: ProductBuilderProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initial);
  const knownBrand = initial ? getBrandBySlug(initial.brandSlug) : undefined;

  const [step, setStep] = useState(0);

  // Brand
  const [brandSlug, setBrandSlug] = useState(knownBrand ? knownBrand.slug : "");
  const [addingBrand, setAddingBrand] = useState(Boolean(initial && !knownBrand));
  const [newBrand, setNewBrand] = useState(
    initial && !knownBrand ? initial.brandSlug.replace(/-/g, " ") : "",
  );

  // Model
  const [modelChoice, setModelChoice] = useState(initial ? CUSTOM : ""); // known model name or CUSTOM
  const [title, setTitle] = useState(initial?.title ?? "");
  const [categorySlug, setCategorySlug] = useState<CategorySlug>(
    initial?.categorySlug ?? "mens-watches",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [mrp, setMrp] = useState(initial ? String(initial.mrp) : "");
  const [images, setImages] = useState<string[]>(() => {
    if (!initial) return [];
    if (initial.images?.length) return initial.images;
    return initial.imageUrl ? [initial.imageUrl] : [];
  });
  const [linkDraft, setLinkDraft] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Variants
  const [variants, setVariants] = useState<Variant[]>(
    initial?.variants.length ? initial.variants : [blankVariant()],
  );
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const knownModels = brandSlug ? getModelsForBrand(brandSlug) : [];
  const usingNewBrand = addingBrand && newBrand.trim().length > 0;
  const effectiveBrand = brandSlug || (usingNewBrand ? "new" : "");
  const brandName = brandSlug
    ? getBrandBySlug(brandSlug)?.name ?? brandSlug
    : newBrand.trim();

  const priceN = Number(price) || 0;
  const mrpN = Number(mrp) || 0;
  const off = discountPercent(mrpN, priceN);

  const cleanImages = images.map((s) => s.trim()).filter(Boolean);
  const previewImage = cleanImages[0] || FALLBACK_IMG;

  function pickBrand(value: string) {
    if (value === NEW_BRAND) {
      setAddingBrand(true);
      setBrandSlug("");
    } else {
      setAddingBrand(false);
      setNewBrand("");
      setBrandSlug(value);
    }
    // Reset the dependent model selection whenever the brand changes.
    setModelChoice("");
  }

  function pickModel(value: string) {
    setModelChoice(value);
    if (value === CUSTOM || value === "") {
      setTitle("");
      return;
    }
    const m = knownModels.find((k) => k.name === value);
    if (!m) return;
    // Pre-fill from the known model — admin can still edit everything.
    setTitle(m.name);
    setCategorySlug(m.category);
    setPrice(String(m.price));
    setMrp(String(m.mrp));
  }

  function updateVariant(id: string, patch: Partial<Variant>) {
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: string[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        added.push(await fileToSquareDataUrl(f));
      } catch {
        /* skip files we can't read */
      }
    }
    setImages((arr) => [...arr.filter((u) => u.trim()), ...added]);
    setUploading(false);
  }

  function addLink() {
    const url = linkDraft.trim();
    if (!url) return;
    setImages((arr) => [...arr, url]);
    setLinkDraft("");
  }

  function removeImage(index: number) {
    setImages((arr) => arr.filter((_, i) => i !== index));
  }

  /** Promote a photo to position 0 — the cover shown on cards and listings. */
  function makeCover(index: number) {
    setImages((arr) => {
      const picked = arr[index];
      if (picked === undefined) return arr;
      return [picked, ...arr.filter((_, i) => i !== index)];
    });
  }

  function validateStep(s: number): string | null {
    if (s === 0 && !effectiveBrand) return "Choose a brand or add a new one.";
    if (s === 1) {
      if (!isEdit && knownModels.length > 0 && !modelChoice)
        return "Pick a model, or choose “Other” to type your own.";
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

  /** Jump straight to a step (edit mode) — everything before it must be valid. */
  function goToStep(target: number) {
    for (let s = 0; s < target; s++) {
      const e = validateStep(s);
      if (e) {
        setError(e);
        setStep(s);
        return;
      }
    }
    setError(null);
    setStep(target);
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

  async function save() {
    for (let s = 0; s < 3; s++) {
      const e = validateStep(s);
      if (e) {
        setError(e);
        setStep(s);
        return;
      }
    }
    const slug =
      brandSlug || newBrand.trim().toLowerCase().replace(/\s+/g, "-");
    const gallery = cleanImages.length ? cleanImages : [FALLBACK_IMG];
    const model: Omit<AdminModel, "id" | "createdAt"> = {
      brandSlug: slug,
      title: title.trim(),
      categorySlug,
      description: description.trim(),
      price: priceN,
      mrp: mrpN,
      imageUrl: gallery[0]!,
      images: gallery,
      variants: variants.map((v, i) => ({
        ...v,
        name: v.name.trim(),
        sku:
          v.sku.trim() ||
          `H365-${title.trim().slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, "0")}`,
      })),
    };

    setSaving(true);
    setError(null);
    const failure = isEdit
      ? "Failed to save changes."
      : "Failed to publish product.";
    try {
      const res = await fetch(
        initial ? `/api/admin/products/${initial.id}` : "/api/admin/products",
        {
          method: initial ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(model),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? failure);
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : failure);
      setSaving(false);
    }
  }

  const saveLabel = isEdit
    ? saving
      ? "Saving…"
      : "Save changes"
    : saving
      ? "Publishing…"
      : "Publish product";

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {isEdit ? "Edit product" : "Add a product"}
      </h1>
      <p className="mt-1 text-ink-500">
        {isEdit
          ? "Change anything — photos, price, variants — then save. The live preview updates as you type."
          : "Pick the brand, pick the model, then the variants you actually stock — watch it build live."}
      </p>

      {/* Stepper */}
      <ol className="mt-7 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (i < step) setStep(i);
                else if (isEdit) goToStep(i);
              }}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                i === step
                  ? "bg-gold text-ink"
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

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Form ── */}
        <div className="min-w-0 rounded-3xl border border-bone-300 bg-bone-100 p-6 shadow-glass sm:p-8">
          {step === 0 ? (
            <div className="space-y-5">
              <Field label="Company / brand">
                <select
                  value={addingBrand ? NEW_BRAND : brandSlug}
                  onChange={(e) => pickBrand(e.target.value)}
                  className={cn(inputCls, "appearance-none pr-10")}
                >
                  <option value="" disabled>
                    Select a brand…
                  </option>
                  {activeBrands.map((b) => (
                    <option key={b.id} value={b.slug}>
                      {b.name}
                    </option>
                  ))}
                  <option value={NEW_BRAND}>+ Add a new brand…</option>
                </select>
              </Field>

              {addingBrand ? (
                <Field label="New brand name">
                  <input
                    autoFocus
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="e.g. Citizen"
                    className={inputCls}
                  />
                </Field>
              ) : null}

              {brandSlug && knownModels.length > 0 ? (
                <p className="rounded-xl bg-bone-200 px-4 py-3 text-sm text-ink-600">
                  Nice — <strong>{brandName}</strong> has{" "}
                  {knownModels.length} ready-made model
                  {knownModels.length === 1 ? "" : "s"} to choose from next.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              {/* Cascading brand → model context */}
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full bg-gold/15 px-3 py-1 font-semibold text-gold-700">
                  {brandName || "Brand"}
                </span>
                <span className="text-ink-400" aria-hidden="true">
                  →
                </span>
                <span className="text-ink-500">
                  {title || "choose a model"}
                </span>
              </div>

              {knownModels.length > 0 ? (
                <Field label={`${brandName} models`}>
                  <select
                    value={modelChoice}
                    onChange={(e) => pickModel(e.target.value)}
                    className={cn(inputCls, "appearance-none pr-10")}
                  >
                    <option value="" disabled>
                      Select a model…
                    </option>
                    {knownModels.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                    <option value={CUSTOM}>+ Other (type your own)…</option>
                  </select>
                </Field>
              ) : null}

              {/* Editable model name (prefilled from the dropdown, or free text) */}
              {knownModels.length === 0 || modelChoice ? (
                <Field label="Model name">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. G-Shock GA-2100"
                    className={inputCls}
                  />
                </Field>
              ) : null}

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

              {/* Photo gallery — upload from device or paste links */}
              <Field label="Product photos">
                <p className="mb-3 text-xs text-ink-500">
                  Photos are kept whole — nothing is cropped. The first one is
                  the cover; tap ★ on any photo to make it the cover.
                </p>

                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {cleanImages.map((url, i) => (
                    <div
                      key={`${url.slice(0, 24)}-${i}`}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-bone-300 bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(url)}
                        aria-label={`View photo ${i + 1} full-size`}
                        className="absolute inset-0"
                      >
                        <Image
                          src={url}
                          alt={`Product photo ${i + 1}`}
                          fill
                          sizes="(max-width: 640px) 33vw, 160px"
                          className="object-contain p-1"
                          unoptimized
                        />
                      </button>
                      {i === 0 ? (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">
                          Cover
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeCover(i)}
                          aria-label={`Make photo ${i + 1} the cover`}
                          title="Make cover"
                          className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/60 text-xs text-white transition hover:bg-gold hover:text-ink"
                        >
                          ★
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label={`Remove photo ${i + 1}`}
                        title="Remove"
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/60 text-xs text-white transition hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <label
                    className={cn(
                      "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-bone-400 text-center text-xs font-semibold text-ink-500 transition hover:border-gold hover:text-gold",
                      uploading && "opacity-60",
                    )}
                  >
                    <span className="text-xl leading-none" aria-hidden="true">
                      +
                    </span>
                    {uploading ? "Uploading…" : "Add photos"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        void onPickFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={linkDraft}
                    onChange={(e) => setLinkDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLink();
                      }
                    }}
                    placeholder="…or paste an image link"
                    className={cn(inputCls, "min-w-0 flex-1")}
                  />
                  <button
                    type="button"
                    onClick={addLink}
                    disabled={!linkDraft.trim()}
                    className="shrink-0 rounded-xl border border-bone-300 px-4 py-2.5 text-sm font-semibold transition enabled:hover:border-gold enabled:hover:text-gold disabled:opacity-40"
                  >
                    Add link
                  </button>
                </div>
              </Field>

              <Field label="About this product">
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a short, punchy description — key features, what makes it worth buying…"
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
                Looks good? {isEdit ? "Saving updates" : "Publishing adds"}{" "}
                <strong>
                  {brandName} {title || "this model"}
                </strong>{" "}
                with <strong>{variants.length}</strong> variant
                {variants.length === 1 ? "" : "s"} and{" "}
                <strong>{cleanImages.length || 1}</strong> photo
                {cleanImages.length === 1 ? "" : "s"}
                {isEdit ? "." : " to your catalogue."}
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
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink-500 transition enabled:hover:text-ink disabled:opacity-30"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              {/* In edit mode every field is already filled, so the admin can
                  save from any step instead of walking to the end. */}
              {isEdit && step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-full border border-bone-300 px-4 py-2 text-sm font-semibold transition enabled:hover:border-gold enabled:hover:text-gold disabled:opacity-50"
                >
                  {saveLabel}
                </button>
              ) : null}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} className="btn-gold">
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="btn-gold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveLabel}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Live preview ── */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <p className="mb-3 text-xs font-semibold uppercase tracking-label text-ink-500">
            Live preview
          </p>
          <div className="overflow-hidden rounded-2xl border border-bone-300 bg-bone-100 shadow-product">
            <div className="relative aspect-square bg-white">
              <Image
                src={previewImage}
                alt=""
                fill
                sizes="340px"
                className="object-contain"
                unoptimized
              />
              {off > 0 ? (
                <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-ink">
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

              {cleanImages.length > 1 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cleanImages.slice(0, 6).map((url, i) => (
                    <span
                      key={i}
                      className="relative h-9 w-9 overflow-hidden rounded-lg bg-white ring-1 ring-bone-300"
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-contain"
                        unoptimized
                      />
                    </span>
                  ))}
                </div>
              ) : null}

              {variants.some((v) => v.name) ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
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

          {/* Summary — keeps the column useful (and full) beside a long form. */}
          <dl className="mt-4 divide-y divide-bone-300 rounded-2xl border border-bone-300 bg-bone-100 px-4 shadow-glass">
            <SummaryRow label="Brand" value={brandName || "—"} />
            <SummaryRow label="Model" value={title || "—"} />
            <SummaryRow
              label="Category"
              value={categories.find((c) => c.slug === categorySlug)?.name ?? "—"}
            />
            <SummaryRow label="Price" value={priceN ? formatINR(priceN) : "—"} />
            <SummaryRow label="Photos" value={String(cleanImages.length)} />
            <SummaryRow
              label="Variants"
              value={String(variants.filter((v) => v.name.trim()).length)}
            />
            <SummaryRow
              label="In stock"
              value={String(
                variants.reduce(
                  (n, v) =>
                    n +
                    (v.name.trim() && v.availability === "in_stock"
                      ? v.stockQty
                      : 0),
                  0,
                ),
              )}
            />
          </dl>
        </aside>
      </div>

      {previewUrl ? (
        <ImageLightbox
          src={previewUrl}
          alt="Full-size product photo"
          onClose={() => setPreviewUrl(null)}
        />
      ) : null}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-bone-300 bg-bone-100 px-4 py-2.5 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30 placeholder:text-ink-400";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
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
              v.availability === a ? "bg-gold text-ink" : "text-ink-500",
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
