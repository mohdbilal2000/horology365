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
    <figure className="flex h-full flex-col rounded-2xl border border-bone-300 bg-bone-100 p-6 shadow-product">
      <StarRating rating={review.rating} size="md" />
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-700">
        “{review.body}”
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-bone-300 pt-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-xs font-semibold text-gold">
          {initials}
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold">{review.author}</span>
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
  return (
    <section className="band-light py-14 sm:py-20">
      <div className="shell">
        <SectionHeader
          label="Verified Buyers"
          title="What the Wrist Says"
          align="center"
        />
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
