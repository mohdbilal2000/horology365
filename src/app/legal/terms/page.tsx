import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms and conditions governing your use of Horology365.",
};

export default function TermsPage() {
  return (
    <LegalPage
      label="Legal"
      title="Terms of Service"
      updated="22 June 2026"
      intro="By using Horology365 and placing an order, you agree to these terms."
      sections={[
        {
          heading: "1. Use of the site",
          body: [
            "Horology365 is an online watch reseller operating a pre-order drop model. You may use this site to browse and purchase products for personal, non-commercial use.",
            "You agree to provide accurate information at checkout and not to misuse the site, attempt unauthorised access, or interfere with its operation.",
          ],
        },
        {
          heading: "2. Products and pricing",
          body: [
            "All watches listed are 100% authentic and sold with the manufacturer's warranty where applicable. Product images are representative; minor variation may occur.",
            "Prices are listed in Indian Rupees (INR) and include applicable taxes unless stated otherwise. We reserve the right to correct pricing errors and to change prices before an order is confirmed.",
          ],
        },
        {
          heading: "3. Pre-orders",
          body: [
            "Pre-order items ship in the next scheduled drop. The expected drop date shown is an estimate and may shift; we will keep you updated via WhatsApp or email.",
            "Placing a pre-order reserves your unit at the listed price.",
          ],
        },
        {
          heading: "4. Orders and payment",
          body: [
            "An order is confirmed once you receive a confirmation with an order number. Cash on Delivery is currently available; UPI and other online methods are being enabled.",
            "We reserve the right to cancel any order in cases of suspected fraud, stock unavailability or pricing errors, with a full refund of any amount paid.",
          ],
        },
        {
          heading: "5. Limitation of liability",
          body: [
            "To the extent permitted by law, Horology365 is not liable for indirect or consequential losses arising from the use of the site or products. Our total liability for any order is limited to the amount paid for that order.",
          ],
        },
        {
          heading: "6. Contact",
          body: [
            "Questions about these terms? Reach us on WhatsApp or at support@horology365.com.",
          ],
        },
      ]}
    />
  );
}
