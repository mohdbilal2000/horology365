import Link from "next/link";
import { SITE } from "@/lib/config";
import { activeBrands } from "@/lib/mock/brands";
import { whatsappLink } from "@/lib/utils";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Logo } from "@/components/Logo";

const ONLINE_SHOPPING = [
  { label: "Men's Watches", href: "/category/mens-watches" },
  { label: "Women's Watches", href: "/category/womens-watches" },
  { label: "This Week's Drop", href: "/#weekly-drop" },
  { label: "Offers & Sale", href: "/#offers" },
] as const;

const USEFUL_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Why Buy From Us", href: "/why-buy" },
  { label: "Contact", href: "/contact" },
  { label: "Shipping Policy", href: "/legal/shipping" },
  { label: "Returns & Refunds", href: "/legal/returns" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
] as const;

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "YouTube", href: "https://youtube.com" },
] as const;

export function SiteFooter() {
  return (
    <footer className="band-dark border-t border-white/10">
      {/* Newsletter / drop-alert band */}
      <div className="border-b border-white/10">
        <div className="shell flex flex-col gap-6 py-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-lg">
            <h2 className="t-h3">Never miss a drop.</h2>
            <p className="mt-1.5 text-sm text-bone/60">
              Get early access to every batch and member-only offers, straight to
              your inbox.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      <div className="shell section-y">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand blurb */}
          <div className="lg:col-span-2">
            <Logo className="h-14" />
            <p className="mt-4 max-w-sm text-sm text-bone/60">{SITE.description}</p>
            <a
              href={whatsappLink(
                SITE.whatsappNumber,
                "Hi Horology365 👋 I'd like help with an order.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold transition hover:text-gold-300"
            >
              WhatsApp us → +{SITE.whatsappNumber}
            </a>
          </div>

          <FooterColumn title="Online Shopping" links={ONLINE_SHOPPING} />
          <FooterColumn title="Useful Links" links={USEFUL_LINKS} />

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-label text-bone/50">
              Top Brands
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {activeBrands.slice(0, 7).map((brand) => (
                <li key={brand.id}>
                  <Link
                    href={`/brand/${brand.slug}`}
                    className="text-bone/70 transition hover:text-gold"
                  >
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-bone/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-bone/50">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <div className="flex gap-5">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium uppercase tracking-wide text-bone/60 transition hover:text-gold"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-label text-bone/50">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-bone/70 transition hover:text-gold"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
