"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import {
  useCartStore,
  cartSubtotal,
  cartShipping,
  cartSavings,
} from "@/lib/store/cart";
import { validateCheckout, type FieldErrors } from "@/lib/validation";
import { formatINR } from "@/lib/utils";
import {
  COD_ENABLED,
  UPI_ENABLED,
  BANK_ENABLED,
  CARD_ENABLED,
  UPI,
  BANK,
  buildUpiUri,
} from "@/lib/config";
import { cn } from "@/lib/utils";
import type { CheckoutDetails, Order, PaymentMethod } from "@/lib/types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const INITIAL: CheckoutDetails = {
  name: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  paymentMethod: UPI_ENABLED ? "upi" : "cod",
  upiReference: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const [form, setForm] = useState<CheckoutDetails>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopiedField(field);
        window.setTimeout(() => setCopiedField(null), 1500);
      })
      .catch(() => undefined);
  }

  const subtotal = cartSubtotal(items);
  const shipping = cartShipping(subtotal);
  const savings = cartSavings(items);
  const total = subtotal + shipping;

  const upiUri = buildUpiUri(total, "Horology365 order");

  // Generate the UPI QR whenever the payable amount changes.
  useEffect(() => {
    if (!UPI_ENABLED || total <= 0) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(upiUri, { margin: 1, width: 320, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [upiUri, total]);

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
      if (form.paymentMethod === "card") {
        await submitCardPayment();
        return;
      }

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

      // Safety net for pre-storage-setup: /order/[id] falls back to this if
      // the server-side order lookup finds nothing yet.
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

  async function submitCardPayment() {
    const res = await fetch("/api/razorpay/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ details: form, items }),
    });
    const data = (await res.json()) as {
      orderId?: string;
      razorpayOrderId?: string;
      amount?: number;
      keyId?: string;
      error?: string;
      errors?: FieldErrors;
    };

    if (!res.ok || !data.orderId || !data.razorpayOrderId) {
      if (data.errors) setErrors(data.errors);
      setServerError(data.error ?? "Could not start the card payment.");
      setSubmitting(false);
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      setServerError("Could not load the payment window. Check your connection.");
      setSubmitting(false);
      return;
    }

    const rzp = new window.Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: "INR",
      name: "Horology365",
      order_id: data.razorpayOrderId,
      prefill: { name: form.name, contact: form.phone, email: form.email },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const verifyRes = await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        if (!verifyRes.ok) {
          setServerError("Payment verification failed. Contact us with your payment id.");
          setSubmitting(false);
          return;
        }
        clear();
        router.push(`/order/${data.orderId}`);
      },
      modal: {
        ondismiss: () => setSubmitting(false),
      },
    });
    rzp.open();
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
                method="upi"
                selected={form.paymentMethod === "upi"}
                onSelect={() => UPI_ENABLED && update("paymentMethod", "upi")}
                disabled={!UPI_ENABLED}
                title="UPI"
                subtitle="Pay instantly via any UPI app — GPay, PhonePe, Paytm."
              />
              {BANK_ENABLED ? (
                <PaymentOption
                  method="bank_transfer"
                  selected={form.paymentMethod === "bank_transfer"}
                  onSelect={() => update("paymentMethod", "bank_transfer")}
                  disabled={false}
                  title="Bank Transfer"
                  subtitle="NEFT / IMPS directly to our bank account."
                />
              ) : null}
              <PaymentOption
                method="cod"
                selected={form.paymentMethod === "cod"}
                onSelect={() => COD_ENABLED && update("paymentMethod", "cod")}
                disabled={!COD_ENABLED}
                title="Cash on Delivery"
                subtitle={
                  COD_ENABLED
                    ? "Pay when your watch arrives."
                    : "Coming soon — pay on delivery is being enabled."
                }
              />
              {CARD_ENABLED ? (
                <PaymentOption
                  method="card"
                  selected={form.paymentMethod === "card"}
                  onSelect={() => update("paymentMethod", "card")}
                  disabled={false}
                  title="Card / Net Banking"
                  subtitle="Cards, net banking, wallets & UPI via Razorpay's secure checkout."
                />
              ) : null}
              {errors.paymentMethod ? (
                <p className="text-sm text-red-600">{errors.paymentMethod}</p>
              ) : null}

              {/* UPI pay panel — VPA + QR + reference */}
              {form.paymentMethod === "upi" ? (
                <div className="mt-2 rounded-2xl border border-gold/30 bg-gold/5 p-5">
                  <p className="text-sm font-semibold text-ink">
                    Pay {formatINR(total)} to complete your order
                  </p>
                  <div className="mt-4 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
                    <div className="mx-auto rounded-xl bg-white p-3 shadow-product sm:mx-0">
                      {qrDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qrDataUrl}
                          alt="UPI payment QR code"
                          width={160}
                          height={160}
                          className="h-40 w-40"
                        />
                      ) : (
                        <div className="flex h-40 w-40 items-center justify-center text-xs text-ink-500">
                          Generating QR…
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-label text-ink-500">
                          Scan, or pay to UPI ID
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="rounded-lg bg-bone-200 px-3 py-1.5 text-sm font-semibold">
                            {UPI.vpa}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(UPI.vpa, "vpa")}
                            className="rounded-lg border border-bone-300 px-3 py-1.5 text-xs font-medium transition hover:border-gold hover:text-gold-600"
                          >
                            {copiedField === "vpa" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <a
                        href={upiUri}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600 hover:text-gold-700"
                      >
                        Open in a UPI app →
                      </a>
                      <p className="text-xs text-ink-500">
                        After paying, enter the UPI reference / UTR below so we can
                        verify and ship your order.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Field
                      label="UPI transaction reference / UTR"
                      value={form.upiReference ?? ""}
                      onChange={(v) => update("upiReference", v)}
                      error={errors.upiReference}
                      placeholder="e.g. 4567 8910 1234"
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>
              ) : null}

              {/* Bank transfer panel — account details + reference */}
              {form.paymentMethod === "bank_transfer" ? (
                <div className="mt-2 rounded-2xl border border-gold/30 bg-gold/5 p-5">
                  <p className="text-sm font-semibold text-ink">
                    Transfer {formatINR(total)} to complete your order
                  </p>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink-500">Account name</dt>
                      <dd className="font-medium">{BANK.accountName}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink-500">Account number</dt>
                      <dd className="flex items-center gap-2">
                        <code className="rounded-lg bg-bone-200 px-3 py-1.5 font-semibold">
                          {BANK.accountNumber}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(BANK.accountNumber, "account")}
                          className="rounded-lg border border-bone-300 px-3 py-1.5 text-xs font-medium transition hover:border-gold hover:text-gold-600"
                        >
                          {copiedField === "account" ? "Copied!" : "Copy"}
                        </button>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink-500">IFSC</dt>
                      <dd className="flex items-center gap-2">
                        <code className="rounded-lg bg-bone-200 px-3 py-1.5 font-semibold">
                          {BANK.ifsc}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(BANK.ifsc, "ifsc")}
                          className="rounded-lg border border-bone-300 px-3 py-1.5 text-xs font-medium transition hover:border-gold hover:text-gold-600"
                        >
                          {copiedField === "ifsc" ? "Copied!" : "Copy"}
                        </button>
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-xs text-ink-500">
                    After transferring, enter the reference number below so we can
                    verify and ship your order.
                  </p>
                  <div className="mt-4">
                    <Field
                      label="Bank transfer reference number"
                      value={form.upiReference ?? ""}
                      onChange={(v) => update("upiReference", v)}
                      error={errors.upiReference}
                      placeholder="From your bank's transfer confirmation"
                      required
                    />
                  </div>
                </div>
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
                : form.paymentMethod === "upi" || form.paymentMethod === "bank_transfer"
                  ? "I've paid — place order"
                  : form.paymentMethod === "card"
                    ? "Pay by card"
                    : "Place order (COD)"}
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
