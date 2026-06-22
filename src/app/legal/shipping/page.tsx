import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "Delivery timelines, charges and tracking for Horology365 orders.",
};

export default function ShippingPage() {
  return (
    <LegalPage
      label="Legal"
      title="Shipping Policy"
      updated="22 June 2026"
      intro="Where we ship, how long it takes, and what it costs."
      sections={[
        {
          heading: "1. Coverage",
          body: [
            "We ship across India. Some remote PIN codes may have limited courier availability; we'll let you know if your area is affected.",
          ],
        },
        {
          heading: "2. Charges",
          body: [
            "Shipping is free on orders of ₹1,499 and above. Orders below that carry a flat ₹79 shipping fee, shown at checkout.",
          ],
        },
        {
          heading: "3. Dispatch and delivery time",
          body: [
            "In-stock items are dispatched within 1–2 business days and typically delivered in 3–7 business days.",
            "Pre-order items are dispatched after the scheduled drop date shown on the product page. We'll keep you posted as the drop approaches.",
          ],
        },
        {
          heading: "4. Tracking",
          body: [
            "Once your order ships, we'll share a tracking link over WhatsApp or email so you can follow it to your door.",
          ],
        },
        {
          heading: "5. Delays",
          body: [
            "Occasionally couriers face delays due to weather, festivals or operational issues. If your order is significantly delayed, reach out and we'll chase it for you.",
          ],
        },
      ]}
    />
  );
}
