import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { activeBrands } from "@/lib/mock/brands";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Horology365 is a pre-order watch showroom bringing authentic, affordable fashion watches to India — dropped in batches, delivered with care.",
};

const STATS = [
  { value: "14", label: "Brands in the showroom" },
  { value: "100%", label: "Authentic, sealed-box" },
  { value: "7-day", label: "Easy returns" },
  { value: "365", label: "Days of new drops" },
] as const;

export default function AboutPage() {
  return (
    <div className="band-light">
      <PageHeader
        label="Our Story"
        title="A showroom for the watches you actually want to wear."
        intro="Horology365 began with a simple frustration: great fashion watches were either overpriced at the mall or a gamble online. We fixed both."
      />

      <div className="shell grid gap-12 py-14 sm:py-20 lg:grid-cols-2">
        <div className="space-y-4 text-ink-700">
          <h2 className="font-serif text-2xl text-ink">The pre-order drop model</h2>
          <p>
            Instead of sitting on dead stock, we run a pre-order drop model. You
            reserve the watch you want, we bring in the batch, and you get a fair
            price without the markup of holding inventory all year. Every drop is
            announced ahead of time, so you never miss the piece you’ve had your eye
            on.
          </p>
          <p>
            Everything we sell is 100% authentic and comes sealed with its brand
            warranty. If something isn’t right, our 7-day returns and real human
            WhatsApp support make it easy to sort out.
          </p>
          <h2 className="mt-8 font-serif text-2xl text-ink">What we stand for</h2>
          <ul className="space-y-2">
            <li>✓ Honest pricing — no inflated MRP games.</li>
            <li>✓ Authentic product, every single time.</li>
            <li>✓ Fast, friendly support on WhatsApp.</li>
            <li>✓ Pay your way — Cash on Delivery today, UPI soon.</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4 self-start">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-bone-300 bg-bone-100 p-6 text-center shadow-product"
            >
              <p className="font-serif text-4xl text-gold">{stat.value}</p>
              <p className="mt-1 text-sm text-ink-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="band-dark py-12">
        <div className="shell">
          <p className="eyebrow">Brands we carry</p>
          <p className="mt-3 text-lg text-bone/80">
            {activeBrands.map((b) => b.name).join(" · ")}
          </p>
        </div>
      </section>
    </div>
  );
}
