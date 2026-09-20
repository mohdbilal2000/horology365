"use client";

import { useEffect, useState } from "react";

interface AdminSettingsView {
  upiVpa: string;
  upiPayeeName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  storeWhatsApp: string;
  whatsappPhoneId: string;
  whatsappTokenSet: boolean;
  whatsappTokenHint: string;
  updatedAt: string | null;
}

const inputCls =
  "w-full rounded-xl border border-bone-300 bg-bone-100 px-4 py-2.5 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30 placeholder:text-ink-400";

export function SettingsPanel() {
  const [view, setView] = useState<AdminSettingsView | null>(null);
  const [form, setForm] = useState({
    upiVpa: "",
    upiPayeeName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    storeWhatsApp: "",
    whatsappPhoneId: "",
    whatsappToken: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("Could not load settings.");
        const data = (await res.json()) as { settings: AdminSettingsView };
        if (!active) return;
        setView(data.settings);
        setForm((f) => ({
          ...f,
          upiVpa: data.settings.upiVpa,
          upiPayeeName: data.settings.upiPayeeName,
          bankAccountName: data.settings.bankAccountName,
          bankAccountNumber: data.settings.bankAccountNumber,
          bankIfsc: data.settings.bankIfsc,
          storeWhatsApp: data.settings.storeWhatsApp,
          whatsappPhoneId: data.settings.whatsappPhoneId,
        }));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Load failed.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // The token is only sent when the owner actually typed a new one.
      const patch: Record<string, string> = {
        upiVpa: form.upiVpa,
        upiPayeeName: form.upiPayeeName,
        bankAccountName: form.bankAccountName,
        bankAccountNumber: form.bankAccountNumber,
        bankIfsc: form.bankIfsc,
        storeWhatsApp: form.storeWhatsApp,
        whatsappPhoneId: form.whatsappPhoneId,
      };
      if (form.whatsappToken.trim()) patch.whatsappToken = form.whatsappToken.trim();

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json().catch(() => ({}))) as {
        settings?: AdminSettingsView;
        error?: string;
      };
      if (!res.ok || !data.settings) {
        throw new Error(data.error ?? "Could not save.");
      }
      setView(data.settings);
      setForm((f) => ({ ...f, whatsappToken: "" }));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-bone-300/60" />;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        Settings
      </h1>
      <p className="mt-1 text-ink-500">
        Payment details buyers pay to, and the WhatsApp connection that sends
        order invoices. Changes go live on the next page load.
      </p>

      <div className="mt-8 space-y-8">
        {/* UPI */}
        <Section title="UPI (QR code)" hint="The QR at checkout is generated from these.">
          <Field label="UPI ID (VPA)">
            <input
              className={inputCls}
              value={form.upiVpa}
              onChange={(e) => set("upiVpa", e.target.value)}
              placeholder="name@bank"
            />
          </Field>
          <Field label="Payee name">
            <input
              className={inputCls}
              value={form.upiPayeeName}
              onChange={(e) => set("upiPayeeName", e.target.value)}
              placeholder="Account holder name"
            />
          </Field>
        </Section>

        {/* Bank */}
        <Section title="Bank transfer" hint="Shown to buyers who pay by NEFT/IMPS.">
          <Field label="Account holder name">
            <input
              className={inputCls}
              value={form.bankAccountName}
              onChange={(e) => set("bankAccountName", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account number">
              <input
                className={inputCls}
                value={form.bankAccountNumber}
                onChange={(e) => set("bankAccountNumber", e.target.value)}
              />
            </Field>
            <Field label="IFSC">
              <input
                className={inputCls}
                value={form.bankIfsc}
                onChange={(e) => set("bankIfsc", e.target.value.toUpperCase())}
              />
            </Field>
          </div>
        </Section>

        {/* WhatsApp */}
        <Section
          title="WhatsApp notifications"
          hint="Sends the order invoice to the customer and to you. Re-enter the token here if WhatsApp stops sending."
        >
          <Field label="Store WhatsApp number (with country code)">
            <input
              className={inputCls}
              value={form.storeWhatsApp}
              onChange={(e) => set("storeWhatsApp", e.target.value)}
              placeholder="919876543210"
            />
          </Field>
          <Field label="WhatsApp phone-number ID">
            <input
              className={inputCls}
              value={form.whatsappPhoneId}
              onChange={(e) => set("whatsappPhoneId", e.target.value)}
              placeholder="From Meta WhatsApp Manager"
            />
          </Field>
          <Field label="Access token">
            <input
              type="password"
              className={inputCls}
              value={form.whatsappToken}
              onChange={(e) => set("whatsappToken", e.target.value)}
              placeholder={
                view?.whatsappTokenSet
                  ? `Saved (${view.whatsappTokenHint}) — leave blank to keep`
                  : "Paste the Meta access token"
              }
            />
            <p className="mt-1 text-xs text-ink-400">
              Stored privately and never shown again. Leave blank to keep the
              current token.
            </p>
          </Field>
        </Section>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            Saved. Live on the next page load.
          </p>
        ) : null}

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {view?.updatedAt ? (
            <span className="text-xs text-ink-400">
              Last updated {new Date(view.updatedAt).toLocaleString("en-IN")}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-bone-300 bg-bone-100 p-6 shadow-glass sm:p-7">
      <h2 className="font-serif text-lg font-bold">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-ink-500">{hint}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink-700">
        {label}
      </label>
      {children}
    </div>
  );
}
