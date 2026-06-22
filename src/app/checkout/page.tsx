"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCartStore,
  cartSubtotal,
  cartShipping,
  cartSavings,
} from "@/lib/store/cart";
import { validateCheckout, type FieldErrors } from "@/lib/validation";
import { formatINR } from "@/lib/utils";
import { COD_ENABLED, UPI_ENABLED } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { CheckoutDetails, Order, PaymentMethod } from "@/lib/types";

const INITIAL: CheckoutDetails = {
  name: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  paymentMethod: COD_ENABLED ? "cod" : "upi",
};

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const [form, setForm] = useState<CheckoutDetails>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const subtotal = cartSubtotal(items);
  const shipping = cartShipping(subtotal);
  const savings = cartSavings(items);
  const total = subtotal + shipping;

  function update<K extends keyof CheckoutDetails>(
    key: K,
    value: CheckoutDetails[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const { ok, errors: fieldErrors } = validateCheckout(form);
    if (!ok) {
      setErrors(fieldErrors);
      return;
    }
    if (items.length === 0) {
      setServerError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: form, items }),
      });
      const data = (await res.json()) as {
        order?: Order;
        error?: string;
        errors?: FieldErrors;
      };

      if (!res.ok || !data.order) {
        if (data.errors) setErrors(data.errors);
        setServerError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Phase 1: hand the confirmation page its order via sessionStorage.
      // Phase 2 reads the persisted order from Supabase by id instead.
      sessionStorage.setItem(
        `order:${data.order.id}`,
        JSON.stringify(data.order),
      );
      clear();
      router.push(`/order/${data.order.id}`);
    } catch {
      setServerError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="band-light">
        <div className="shell flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20 text-center">
          <h1 className="font-serif text-3xl">Nothing to check out</h1>
          <p className="text-ink-500">Add a watch to your cart first.</p>
          <Link href="/" className="btn-gold">
            Browse watches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="band-light">
      <div className="shell py-10 sm:py-14">
        <h1 className="font-serif text-3xl sm:text-4xl">Checkout</h1>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]"
        >
          <div className="space-y-8">
            {/* Contact */}
            <fieldset className="space-y-4">
              <legend className="font-serif text-xl">Contact details</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  value={form.name}
                  onChange={(v) => update("name", v)}
                  error={errors.name}
                  autoComplete="name"
                  required
                />
                <Field
                  label="Mobile number"
                  value={form.phone}
                  onChange={(v) => update("phone", v)}
                  error={errors.phone}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="10-digit mobile"
                  required
                />
              </div>
              <Field
                label="Email (optional)"
                value={form.email ?? ""}
                onChange={(v) => update("email", v)}
                error={errors.email}
                type="email"
                autoComplete="email"
              />
            </fieldset>

            {/* Address */}
            <fieldset className="space-y-4">
              <legend className="font-serif text-xl">Shipping address</legend>
              <Field
                label="Address line 1"
                value={form.addressLine1}
                onChange={(v) => update("addressLine1", v)}
                error={errors.addressLine1}
                autoComplete="address-line1"
                placeholder="House no, building, street"
                required
              />
              <Field
                label="Address line 2 (optional)"
                value={form.addressLine2 ?? ""}
                onChange={(v) => update("addressLine2", v)}
                autoComplete="address-line2"
                placeholder="Area, landmark"
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="City"
                  value={form.city}
                  onChange={(v) => update("city", v)}
                  error={errors.city}
                  autoComplete="address-level2"
                  required
                />
                <Field
                  label="State"
                  value={form.state}
                  onChange={(v) => update("state", v)}
                  error={errors.state}
                  autoComplete="address-level1"
                  required
                />
                <Field
                  label="PIN code"
                  value={form.pincode}
                  onChange={(v) => update("pincode", v)}
                  error={errors.pincode}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="6 digits"
                  required
                />
              </div>
            </fieldset>

            {/* Payment */}
            <fieldset className="space-y-3">
              <legend className="font-serif text-xl">Payment method</legend>
              <PaymentOption
                method="cod"
                selected={form.paymentMethod === "cod"}
                onSelect={() => update("paymentMethod", "cod")}
                disabled={!COD_ENABLED}
                title="Cash on Delivery"
                subtitle="Pay when your watch arrives. Available now."
              />
              <PaymentOption
                method="upi"
                selected={form.paymentMethod === "upi"}
                onSelect={() => UPI_ENABLED && update("paymentMethod", "upi")}
                disabled={!UPI_ENABLED}
                title="UPI / Online Payment"
                subtitle={
                  UPI_ENABLED
                    ? "Pay instantly via any UPI app."
                    : "Coming soon — UPI checkout is being enabled."
                }
              />
              {errors.paymentMethod ? (
                <p className="text-sm text-red-600">{errors.paymentMethod}</p>
              ) : null}
            </fieldset>

            {serverError ? (
              <p
                role="alert"
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {serverError}
              </p>
            ) : null}
          </div>

          {/* Summary */}
          <aside className="h-fit rounded-2xl border border-bone-300 bg-bone-100 p-6 lg:sticky lg:top-24">
            <h2 className="font-serif text-xl">Your order</h2>
            <ul className="mt-4 space-y-3 border-b border-bone-300 pb-4 text-sm">
              {items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="line-clamp-1 font-medium">{item.title}</span>
                    <span className="text-ink-500">Qty {item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatINR(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Subtotal</dt>
                <dd>{formatINR(subtotal)}</dd>
              </div>
              {savings > 0 ? (
                <div className="flex justify-between text-gold-600">
                  <dt>Savings</dt>
                  <dd>−{formatINR(savings)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-600">Shipping</dt>
                <dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-between border-t border-bone-300 pt-4">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-semibold">{formatINR(total)}</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-gold mt-6 w-full"
            >
              {submitting
                ? "Placing order…"
                : form.paymentMethod === "cod"
                  ? "Place order (COD)"
                  : "Pay now"}
            </button>
            <p className="mt-3 text-center text-xs text-ink-500">
              By placing your order you agree to our{" "}
              <Link href="/legal/terms" className="underline hover:text-gold">
                Terms
              </Link>
              .
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  required,
}: FieldProps) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
        {required ? <span className="text-gold"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "w-full rounded-xl border bg-bone-100 px-4 py-3 text-ink outline-none transition placeholder:text-ink-500/70 focus:ring-2 focus:ring-gold",
          error ? "border-red-400" : "border-bone-300 focus:border-gold",
        )}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PaymentOption({
  selected,
  onSelect,
  disabled,
  title,
  subtitle,
}: {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition",
        disabled
          ? "cursor-not-allowed border-bone-300 opacity-55"
          : "hover:border-gold",
        selected ? "border-gold bg-gold/5" : "border-bone-300",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-gold" : "border-bone-400",
        )}
      >
        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-gold" /> : null}
      </span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-ink-500">{subtitle}</span>
      </span>
    </button>
  );
}
