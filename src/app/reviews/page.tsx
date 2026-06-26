import type { Metadata } from "next";
import { ReviewsSection } from "@/components/ReviewCard";
import { reviews } from "@/lib/mock";

export const metadata: Metadata = {
  title: "Customer Reviews",
  description:
    "Verified Horology365 buyer reviews — sealed boxes, on-time drops and real support.",
};

export default function ReviewsPage() {
  return (
    <div className="band-light">
      <ReviewsSection reviews={reviews} />
    </div>
  );
}
