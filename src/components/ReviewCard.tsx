import { StarRating } from "@/components/ui/StarRating";
import { SectionHeader } from "@/components/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import type { Review } from "@/lib/types";

export function ReviewCard({ review }: { review: Review }) {
  const initials = review.author
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <figure className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-bone-300 bg-bone-100 p-6 shadow-product transition duration-300 hover:-translate-y-1 hover:shadow-product-hover">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-4 select-none font-serif text-[7rem] leading-none text-gold/10"
      >
        &rdquo;
      </span>
      <StarRating rating={review.rating} size="md" />
      <blockquote className="relative mt-4 flex-1 text-[15px] leading-relaxed text-ink-700">
        {review.body}
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-bone-300 pt-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-xs font-bold text-ink">
          {initials}
        </span>
        <span className="leading-tight">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {review.author}
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gold" fill="currentColor" aria-hidden="true" aria-label="Verified">
              <path d="M12 2l2.4 1.8 3-.2 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L3.2 16l.9-2.9L3.2 10l2.4-1.7 1-2.8 3 .2L12 2z" />
              <path d="M10.6 14.6l-2-2 1-1 1 1 2.8-2.8 1 1-3.8 3.8z" fill="#fff" />
            </svg>
          </span>
          <span className="block text-xs text-ink-500">
            {review.location} · {review.productTitle}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  const avg =
    Math.round(
      (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
    ) / 10;

  return (
    <section className="band-light section-y">
      <div className="shell">
        <SectionHeader
          label="Verified Buyers"
          title="What the Wrist Says"
          description="Sealed boxes, on-time drops and real support — in our buyers' words."
          align="center"
        />

        {/* Aggregate social-proof summary */}
        <Reveal className="mx-auto mb-10 flex max-w-md flex-col items-center gap-2 rounded-3xl border border-bone-300 bg-bone-100 px-8 py-6 text-center shadow-product sm:mb-12">
          <span className="font-serif text-5xl font-bold tracking-tight">{avg}</span>
          <StarRating rating={avg} size="md" />
          <span className="text-sm text-ink-500">
            Based on {reviews.length} verified reviews · 96% would recommend
          </span>
        </Reveal>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, i) => (
            <Reveal key={review.id} delay={(i % 3) * 70} as="div">
              <ReviewCard review={review} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
