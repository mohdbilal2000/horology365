"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

/**
 * Read a picked file and downscale it in the browser to keep the stored
 * data-URL small (localStorage is the Phase-1 backing store). Falls back to the
 * raw data URL if the canvas step fails for any reason.
 */
async function fileToCompressedDataUrl(
  file: File,
  max = 1000,
  quality = 0.82,
): Promise<string> {
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
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale === 1 && raw.length < 400_000) return raw;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, w, h);
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

export function ProductBuilder() {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  const [step, setStep] = useState(0);

  // Brand
  const [brandSlug, setBrandSlug] = useState("");
  const [addingBrand, setAddingBrand] = useState(false);
  const [newBrand, setNewBrand] = useState("");

  // Model
  const [modelChoice, setModelChoice] = useState(""); // known model name or CUSTOM
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState<CategorySlug>("mens-watches");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [images, setImages] = useState<string[]>([""]);

  // Variants
  const [variants, setVariants] = useState<Variant[]>([blankVariant()]);
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
        added.push(await fileToCompressedDataUrl(f));
      } catch {
        /* skip files we can't read */
      }
    }
    // Drop any blank URL rows, then append the uploaded images.
    setImages((arr) => {
      const kept = arr.filter((u) => u.trim());
      const merged = [...kept, ...added];
      return merged.length ? merged : [""];
    });
    setUploading(false);
  }

  function validateStep(s: number): string | null {
    if (s === 0 && !effectiveBrand) return "Choose a brand or add a new one.";
    if (s === 1) {
      if (knownModels.length > 0 && !modelChoice)
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

  async function publish() {
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

    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(model),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to publish product.");
      router.push("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish product.");
      setPublishing(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        Add a product
      </h1>
      <p className="mt-1 text-ink-500">
        Pick the brand, pick the model, then the variants you actually stock —
        watch it build live.
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* ── Form ── */}
        <div className="rounded-3xl border border-bone-300 bg-bone-100 p-6 shadow-glass sm:p-8">
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

              {/* Multi-image gallery — paste links or upload from device */}
              <Field label="Product images">
                <p className="mb-2 text-xs text-ink-500">
                  Paste image links (the brand’s official product page works
                  great) or upload straight from your phone or computer. First
                  image is the cover.
                </p>
                <div className="space-y-2">
                  {images.map((url, i) => {
                    const uploaded = url.startsWith("data:");
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-14 shrink-0 text-xs font-semibold text-ink-500">
                          {i === 0 ? "Cover" : `Img ${i + 1}`}
                        </span>
                        {uploaded ? (
                          <span className="flex flex-1 items-center gap-2 rounded-xl border border-bone-300 bg-bone-200 px-3 py-2">
                            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-bone-300">
                              <Image
                                src={url}
                                alt=""
                                fill
                                sizes="36px"
                                className="object-cover"
                                unoptimized
                              />
                            </span>
                            <span className="text-sm text-ink-600">
                              Uploaded from device
                            </span>
                          </span>
                        ) : (
                          <input
                            value={url}
                            onChange={(e) =>
                              setImages((arr) =>
                                arr.map((u, j) => (j === i ? e.target.value : u)),
                              )
                            }
                            placeholder="https://…/watch.jpg"
                            className={inputCls}
                          />
                        )}
                        {images.length > 1 ? (
                          <button
                            type="button"
                            aria-label={`Remove image ${i + 1}`}
                            onClick={() =>
                              setImages((arr) => arr.filter((_, j) => j !== i))
                            }
                            className="shrink-0 rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setImages((arr) => [...arr, ""])}
                    className="text-sm font-semibold text-gold transition hover:text-gold-700"
                  >
                    + Add image URL
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-bone-300 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-gold hover:text-gold">
                    {uploading ? "Uploading…" : "Upload from device"}
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
                Looks good? Publishing adds{" "}
                <strong>
                  {brandName} {title || "this model"}
                </strong>{" "}
                with <strong>{variants.length}</strong> variant
                {variants.length === 1 ? "" : "s"} and{" "}
                <strong>{cleanImages.length || 1}</strong> image
                {cleanImages.length === 1 ? "" : "s"} to your catalogue.
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
              <button
                type="button"
                onClick={publish}
                disabled={publishing}
                className="btn-gold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish product"}
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
                <div className="mt-3 flex gap-1.5">
                  {cleanImages.slice(0, 5).map((url, i) => (
                    <span
                      key={i}
                      className="relative h-9 w-9 overflow-hidden rounded-lg ring-1 ring-bone-300"
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                        unoptimized
                      />
                    </span>
                  ))}
                </div>
              ) : null}

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
