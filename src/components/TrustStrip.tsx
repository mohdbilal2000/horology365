import type { ReactNode } from "react";

const ITEMS: { icon: ReactNode; label: string; sub: string }[] = [
  {
    label: "100% Authentic",
    sub: "Sealed-box, brand warranty",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6l7-3zM9.5 12l1.8 1.8L15 10" />
    ),
  },
  {
    label: "UPI Secure",
    sub: "Pay via any UPI app",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 11V8a7 7 0 0114 0v3M5 11h14a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1zM12 15v2" />
    ),
  },
  {
    label: "Easy Returns",
    sub: "7-day no-questions returns",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h11a5 5 0 010 10h-3M4 9l3-3M4 9l3 3" />
    ),
  },
  {
    label: "WhatsApp Support",
    sub: "Real humans, fast replies",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19l1.3-3.9A7 7 0 1112 19a7 7 0 01-3.6-1L4 19z" />
    ),
  },
];

export function TrustStrip() {
  return (
    <section className="band-dark border-y border-white/10" aria-label="Why shop with us">
      <div className="shell">
        {/* Social-proof line */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-white/10 py-4 text-center text-sm">
          <span className="flex items-center gap-1.5 text-gold-300">
            {[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M10 1.5l2.6 5.3 5.9.86-4.25 4.14 1 5.86L10 15.9l-5.25 2.76 1-5.86L1.5 7.66l5.9-.86L10 1.5z" />
              </svg>
            ))}
          </span>
          <span className="font-semibold">4.7 / 5</span>
          <span className="text-bone/60">rated by 3,000+ happy buyers across India</span>
        </div>

        <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-center gap-3 px-3 py-6 text-left sm:py-7"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold-300">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  {item.icon}
                </svg>
              </span>
              <span>
                <span className="block text-sm font-semibold text-bone">{item.label}</span>
                <span className="block text-xs text-bone/55">{item.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
