import type { CategorySlug } from "@/lib/types";

/**
 * Known model lines per brand — powers the cascading "pick a brand → pick a
 * model" dropdown in the admin product builder. Selecting a model pre-fills the
 * category and a suggested price (the admin can always edit). Brands not listed
 * here simply fall back to a free-text model name.
 *
 * As a reseller we stock established product lines, so this is just a
 * convenience catalogue — not an exhaustive master list. Add freely.
 */
export interface KnownModel {
  name: string;
  category: CategorySlug;
  /** Suggested selling price (₹) used to pre-fill the form. */
  price: number;
  /** Suggested MRP (₹) for the strikethrough. */
  mrp: number;
}

export const modelCatalog: Record<string, KnownModel[]> = {
  casio: [
    { name: "Edifice EFR-552D", category: "mens-watches", price: 10995, mrp: 13995 },
    { name: "Edifice EQS-800", category: "mens-watches", price: 13995, mrp: 17995 },
    { name: "Vintage A168WA", category: "mens-watches", price: 3995, mrp: 5495 },
    { name: "Vintage A158WA", category: "mens-watches", price: 2995, mrp: 4295 },
    { name: "Duro MDV-106 (Marlin)", category: "mens-watches", price: 6995, mrp: 8995 },
    { name: "Enticer MTP-1374", category: "mens-watches", price: 4995, mrp: 6995 },
    { name: "Sheen SHE-4052", category: "womens-watches", price: 9995, mrp: 12995 },
  ],
  "g-shock": [
    { name: "G-Shock GA-2100", category: "mens-watches", price: 9995, mrp: 12995 },
    { name: "G-Shock GA-B2100", category: "mens-watches", price: 14995, mrp: 18995 },
    { name: "G-Shock GD-100", category: "mens-watches", price: 8995, mrp: 11995 },
    { name: "G-Shock GA-900", category: "mens-watches", price: 9495, mrp: 12495 },
    { name: "G-Squad GBA-900", category: "mens-watches", price: 12995, mrp: 15995 },
    { name: "Baby-G BA-110", category: "womens-watches", price: 8995, mrp: 11495 },
  ],
  titan: [
    { name: "Titan Edge", category: "mens-watches", price: 11995, mrp: 14995 },
    { name: "Titan Neo", category: "mens-watches", price: 4995, mrp: 6495 },
    { name: "Titan Octane", category: "mens-watches", price: 8995, mrp: 11495 },
    { name: "Titan Karishma", category: "mens-watches", price: 3495, mrp: 4995 },
    { name: "Titan Nebula", category: "mens-watches", price: 24995, mrp: 29995 },
    { name: "Titan Smart Pro", category: "mens-watches", price: 7995, mrp: 9995 },
  ],
  fastrack: [
    { name: "Fastrack Reflex Smart", category: "mens-watches", price: 3495, mrp: 4995 },
    { name: "Fastrack Bold", category: "mens-watches", price: 2995, mrp: 4295 },
    { name: "Fastrack Tripster", category: "mens-watches", price: 3295, mrp: 4695 },
    { name: "Fastrack Reload", category: "mens-watches", price: 2495, mrp: 3795 },
    { name: "Fastrack Ruck", category: "mens-watches", price: 2795, mrp: 3995 },
    { name: "Fastrack Fundamentals", category: "womens-watches", price: 2295, mrp: 3495 },
  ],
  sonata: [
    { name: "Sonata Ocean Series", category: "mens-watches", price: 1495, mrp: 2295 },
    { name: "Sonata RPM", category: "mens-watches", price: 1795, mrp: 2695 },
    { name: "Sonata Volt+", category: "mens-watches", price: 1995, mrp: 2995 },
    { name: "Sonata Splash", category: "mens-watches", price: 995, mrp: 1595 },
    { name: "Sonata Stainless Steel", category: "womens-watches", price: 1295, mrp: 1995 },
  ],
  timex: [
    { name: "Timex Weekender", category: "mens-watches", price: 4995, mrp: 6995 },
    { name: "Timex Marlin", category: "mens-watches", price: 9995, mrp: 12995 },
    { name: "Timex Expedition", category: "mens-watches", price: 6995, mrp: 8995 },
    { name: "Timex Q", category: "mens-watches", price: 11995, mrp: 14995 },
  ],
  "titan-raga": [
    { name: "Raga Viva", category: "womens-watches", price: 6995, mrp: 9495 },
    { name: "Raga Moonlight", category: "womens-watches", price: 7995, mrp: 10495 },
    { name: "Raga Power Pearls", category: "womens-watches", price: 8995, mrp: 11995 },
  ],
};

export function getModelsForBrand(slug: string): KnownModel[] {
  return modelCatalog[slug] ?? [];
}
