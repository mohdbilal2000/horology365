const ITEMS = [
  { label: "100% Authentic", sub: "Sealed-box, brand warranty" },
  { label: "UPI Secure", sub: "Pay via any UPI app" },
  { label: "Easy Returns", sub: "7-day no-questions returns" },
  { label: "WhatsApp Support", sub: "Real humans, fast replies" },
] as const;

export function TrustStrip() {
  return (
    <section className="band-dark border-y border-bone/10" aria-label="Why shop with us">
      <div className="shell grid grid-cols-2 gap-px overflow-hidden lg:grid-cols-4">
        {ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1 px-4 py-6 text-center sm:py-8"
          >
            <span className="text-sm font-semibold uppercase tracking-wide text-gold sm:text-base">
              {item.label}
            </span>
            <span className="text-xs text-bone/55">{item.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
