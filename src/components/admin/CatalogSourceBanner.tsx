import { getCatalogStatus } from "@/lib/data/catalogStatus";

/**
 * Loud warning across the top of every admin page whenever the storefront has
 * dropped back to the static demo catalogue. Without it the fallback is
 * invisible from in here: products upload fine one day, and on the next the
 * shop quietly shows its day-one demo content instead, with no clue that the
 * database — not the design — is what changed.
 */
export async function CatalogSourceBanner() {
  const status = await getCatalogStatus();
  if (status.source === "database") return null;

  const cause = status.configured
    ? "The database is configured but is not responding — a paused or sleeping Supabase project is the usual reason."
    : "This deployment has no Supabase keys set, so there is no database to read.";

  return (
    <div className="border-b border-red-900 bg-red-950 px-4 py-3 text-center text-sm text-red-50">
      <p className="font-semibold">
        Storefront is showing the built-in demo catalogue — not your products.
      </p>
      <p className="mx-auto mt-1 max-w-3xl text-red-200">
        {cause} Your uploaded watches are still saved and will reappear on
        their own once the database is reachable again.{" "}
        <span className="whitespace-nowrap">Nothing has been deleted.</span>
      </p>
      {status.error ? (
        <p className="mx-auto mt-1.5 max-w-3xl break-words font-mono text-xs text-red-300/80">
          {status.error}
        </p>
      ) : null}
    </div>
  );
}
