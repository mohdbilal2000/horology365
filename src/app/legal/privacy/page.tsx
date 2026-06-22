import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Horology365 collects, uses and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      label="Legal"
      title="Privacy Policy"
      updated="22 June 2026"
      intro="We collect only what we need to fulfil your order and keep you updated."
      sections={[
        {
          heading: "1. Information we collect",
          body: [
            "When you place an order we collect your name, mobile number, optional email and shipping address. We also collect basic usage analytics to improve the site.",
          ],
        },
        {
          heading: "2. How we use your information",
          body: [
            "We use your details to process and deliver your order, to send order updates over WhatsApp or email, and to provide support. We do not sell your personal data.",
          ],
        },
        {
          heading: "3. Payments",
          body: [
            "For Cash on Delivery, no payment details are stored. When online payments are enabled, transactions are processed by a PCI-compliant payment partner; we never store your full card or UPI credentials.",
          ],
        },
        {
          heading: "4. Cookies and analytics",
          body: [
            "We use cookies and privacy-respecting analytics (such as Google Analytics with IP anonymisation) to understand site usage. You can disable cookies in your browser settings.",
          ],
        },
        {
          heading: "5. Data retention and your rights",
          body: [
            "We retain order data for as long as needed for legal and accounting purposes. You may request access to, correction of, or deletion of your personal data by contacting us.",
          ],
        },
        {
          heading: "6. Contact",
          body: [
            "For any privacy request, email support@horology365.com or message us on WhatsApp.",
          ],
        },
      ]}
    />
  );
}
