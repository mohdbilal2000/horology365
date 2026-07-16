import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ContactForm } from "@/components/ContactForm";
import { SITE, CONTACT } from "@/lib/config";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Horology365 — WhatsApp, email or the contact form. We reply fast.",
};

export default function ContactPage() {
  const waHref = whatsappLink(
    SITE.whatsappNumber,
    "Hi Horology365 👋 I have a question.",
  );

  return (
    <div className="band-light">
      <PageHeader
        label="Get In Touch"
        title="We're around — and we actually reply."
        intro="The fastest way to reach us is WhatsApp. For anything else, drop us a message below."
      />

      <div className="shell grid gap-10 section-y lg:grid-cols-2">
        <div className="space-y-6">
          <ContactCard
            title="WhatsApp"
            value={CONTACT.phoneDisplay}
            href={waHref}
            cta="Chat now"
          />
          <ContactCard
            title="Email"
            value="support@horology365.com"
            href="mailto:support@horology365.com"
            cta="Send email"
          />
          <div className="rounded-2xl border border-bone-300 bg-bone-100 p-6">
            <h2 className="font-serif text-xl">Visit us</h2>
            <address className="mt-2 not-italic text-sm leading-relaxed text-ink-600">
              {CONTACT.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <a
                href={`tel:+${SITE.whatsappNumber}`}
                className="mt-1 inline-block font-medium text-gold-700 transition hover:text-gold"
              >
                {CONTACT.phoneDisplay}
              </a>
            </address>
          </div>

          <div className="rounded-2xl border border-bone-300 bg-bone-100 p-6">
            <h2 className="font-serif text-xl">Support hours</h2>
            <p className="mt-2 text-sm text-ink-600">
              Monday – Saturday, 10:00 AM – 7:00 PM IST.
              <br />
              We typically reply on WhatsApp within a few minutes during hours.
            </p>
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}

function ContactCard({
  title,
  value,
  href,
  cta,
}: {
  title: string;
  value: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-bone-300 bg-bone-100 p-6">
      <div>
        <h2 className="font-serif text-xl">{title}</h2>
        <p className="mt-1 text-sm text-ink-600">{value}</p>
      </div>
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="btn-outline shrink-0 border-ink/20 px-5 py-2.5 text-xs"
      >
        {cta}
      </a>
    </div>
  );
}
