import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Why Buy From Us",
  description:
    "Authentic watches, honest pricing, easy returns and real WhatsApp support. Here's why thousands trust Horology365.",
};

const REASONS = [
  {
    title: "100% Authentic",
    body: "Every watch is genuine, sealed-box and backed by its official brand warranty. No fakes, no first-copies — ever.",
  },
  {
    title: "Honest Pricing",
    body: "We show the real MRP and the real discount. No inflated strike-through prices to make a deal look bigger than it is.",
  },
  {
    title: "Pay On Delivery",
    body: "Cash on Delivery is live now, so you only pay once your watch is in your hands. UPI checkout is coming soon.",
  },
  {
    title: "7-Day Easy Returns",
    body: "Changed your mind or got the wrong fit? Return within 7 days, no drama. We make it right.",
  },
  {
    title: "Real WhatsApp Support",
    body: "Talk to an actual person, fast. Track an order, ask about a drop, or get sizing help — we reply.",
  },
  {
    title: "Weekly Drops",
    body: "Pre-order the next batch and lock today's price. Fresh styles land every week, all year round.",
  },
] as const;

export default function WhyBuyPage() {
  return (
    <div className="band-light">
      <PageHeader
        label="Why Horology365"
        title="Six reasons people stop scrolling and start trusting."
        intro="Buying a watch online shouldn't feel like a gamble. Here's how we make it safe, simple and worth it."
      />

      <div className="shell section-y">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((reason, i) => (
            <div
              key={reason.title}
              className="rounded-2xl border border-bone-300 bg-bone-100 p-6 shadow-product"
            >
              <span className="font-serif text-3xl text-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-3 font-serif text-xl">{reason.title}</h2>
              <p className="mt-2 text-sm text-ink-600">{reason.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl bg-ink p-10 text-center text-bone">
          <h2 className="font-serif text-2xl sm:text-3xl">
            Ready to find your next watch?
          </h2>
          <p className="max-w-md text-bone/70">
            Browse the showroom or jump straight into this week’s drop.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-gold">
              Enter the showroom
            </Link>
            <Link href="/#weekly-drop" className="btn-outline border-bone/40 text-bone">
              See the drop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
