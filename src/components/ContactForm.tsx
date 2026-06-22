"use client";

import { useState } from "react";
import { SITE } from "@/lib/config";
import { whatsappLink } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FormState {
  name: string;
  email: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [sent, setSent] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Partial<FormState> = {};
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email.";
    if (form.message.trim().length < 10)
      next.message = "Please add a few more details.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    // Phase 1: route the enquiry to WhatsApp (no backend yet).
    // Phase 2 swaps this for a server action that emails support.
    const href = whatsappLink(
      SITE.whatsappNumber,
      `Hi Horology365 👋\nName: ${form.name}\nEmail: ${form.email}\n\n${form.message}`,
    );
    window.open(href, "_blank", "noopener,noreferrer");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-bone-300 bg-bone-100 p-10 text-center">
        <h2 className="font-serif text-2xl">Thanks for reaching out!</h2>
        <p className="text-ink-600">
          We’ve opened WhatsApp with your message. Hit send and we’ll reply
          shortly.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setForm({ name: "", email: "", message: "" });
          }}
          className="btn-outline mt-2 border-ink/20"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-2xl border border-bone-300 bg-bone-100 p-6"
    >
      <h2 className="font-serif text-xl">Send us a message</h2>
      <FormField
        id="contact-name"
        label="Name"
        value={form.name}
        onChange={(v) => update("name", v)}
        error={errors.name}
        autoComplete="name"
      />
      <FormField
        id="contact-email"
        label="Email"
        type="email"
        value={form.email}
        onChange={(v) => update("email", v)}
        error={errors.email}
        autoComplete="email"
      />
      <div>
        <label
          htmlFor="contact-message"
          className="mb-1.5 block text-sm font-medium text-ink-700"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          rows={4}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          aria-invalid={Boolean(errors.message)}
          className={cn(
            "w-full resize-y rounded-xl border bg-bone-100 px-4 py-3 text-ink outline-none transition focus:ring-2 focus:ring-gold",
            errors.message ? "border-red-400" : "border-bone-300 focus:border-gold",
          )}
        />
        {errors.message ? (
          <p className="mt-1 text-xs text-red-600">{errors.message}</p>
        ) : null}
      </div>
      <button type="submit" className="btn-gold w-full">
        Send via WhatsApp
      </button>
    </form>
  );
}

function FormField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full rounded-xl border bg-bone-100 px-4 py-3 text-ink outline-none transition focus:ring-2 focus:ring-gold",
          error ? "border-red-400" : "border-bone-300 focus:border-gold",
        )}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
