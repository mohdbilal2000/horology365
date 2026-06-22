import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description: "Our 7-day easy returns and refund policy for Horology365 orders.",
};

export default function ReturnsPage() {
  return (
    <LegalPage
      label="Legal"
      title="Returns & Refunds"
      updated="22 June 2026"
      intro="Changed your mind or received the wrong item? Here's how returns work."
      sections={[
        {
          heading: "1. 7-day return window",
          body: [
            "You can request a return within 7 days of delivery. The watch must be unused, in original condition, with all tags, packaging, warranty card and accessories intact.",
          ],
        },
        {
          heading: "2. How to start a return",
          body: [
            "Message us on WhatsApp or email support@horology365.com with your order number and reason. We'll arrange a pickup or share return instructions.",
          ],
        },
        {
          heading: "3. Refunds",
          body: [
            "Once we receive and inspect the returned watch, your refund is processed within 5–7 business days. For Cash on Delivery orders, refunds are issued to your bank account or UPI ID.",
          ],
        },
        {
          heading: "4. Replacements",
          body: [
            "If you received a damaged or incorrect item, we'll arrange a free replacement or full refund — your choice. Please share unboxing photos to help us resolve it quickly.",
          ],
        },
        {
          heading: "5. Non-returnable cases",
          body: [
            "Returns may be declined if the item shows signs of use, is missing packaging or accessories, or is requested after the 7-day window. Pre-order cancellations before dispatch are fully refunded.",
          ],
        },
      ]}
    />
  );
}
