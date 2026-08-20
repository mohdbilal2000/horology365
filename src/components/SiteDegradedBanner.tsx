import { getCatalogStatus } from "@/lib/data/catalogStatus";

/**
 * Storefront notice shown only during a real outage: Supabase is configured
 * (so this is the live shop, not a dev machine) but isn't answering, which
 * means getAllProducts() is deliberately serving no products rather than
 * demo ones. Without this the shop would just look empty for no stated
 * reason, which reads as broken rather than temporarily unavailable.
 */
export async function SiteDegradedBanner() {
  const status = await getCatalogStatus();
  if (status.source === "database" || !status.configured) return null;

  return (
    <div className="bg-ink px-4 py-2.5 text-center text-sm text-bone-200">
      <p>
        <span className="font-semibold text-gold">
          Our catalogue is briefly unavailable.
        </span>{" "}
        We&apos;re restoring it now — please check back in a few minutes.
        Existing orders are unaffected.
      </p>
    </div>
  );
}
