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
    { name: "G-Shock GA-2100", category: "mens-watches", price: 9995, mrp: 12995 },
    { name: "G-Shock GA-B2100", category: "mens-watches", price: 14995, mrp: 18995 },
    { name: "G-Shock GD-100", category: "mens-watches", price: 8995, mrp: 11995 },
    { name: "G-Shock GA-900", category: "mens-watches", price: 9495, mrp: 12495 },
    { name: "G-Squad GBA-900", category: "mens-watches", price: 12995, mrp: 15995 },
    { name: "Edifice EFR-552D", category: "mens-watches", price: 10995, mrp: 13995 },
    { name: "Edifice EQS-800", category: "mens-watches", price: 13995, mrp: 17995 },
    { name: "Vintage A168WA", category: "mens-watches", price: 3995, mrp: 5495 },
    { name: "Vintage A158WA", category: "mens-watches", price: 2995, mrp: 4295 },
    { name: "Duro MDV-106 (Marlin)", category: "mens-watches", price: 6995, mrp: 8995 },
    { name: "Enticer MTP-1374", category: "mens-watches", price: 4995, mrp: 6995 },
    { name: "Baby-G BA-110", category: "womens-watches", price: 8995, mrp: 11495 },
    { name: "Sheen SHE-4052", category: "womens-watches", price: 9995, mrp: 12995 },
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
  fossil: [
    { name: "Fossil Grant", category: "mens-watches", price: 12995, mrp: 16995 },
    { name: "Fossil Townsman", category: "mens-watches", price: 13995, mrp: 17995 },
    { name: "Fossil Machine", category: "mens-watches", price: 11995, mrp: 15995 },
    { name: "Fossil Neutra", category: "mens-watches", price: 12495, mrp: 15995 },
    { name: "Fossil Jacqueline", category: "womens-watches", price: 10995, mrp: 13995 },
  ],
  diesel: [
    { name: "Diesel Mega Chief", category: "mens-watches", price: 16995, mrp: 21995 },
    { name: "Diesel Mr Daddy 2.0", category: "mens-watches", price: 22995, mrp: 27995 },
    { name: "Diesel Chief", category: "mens-watches", price: 15995, mrp: 19995 },
  ],
  "michael-kors": [
    { name: "MK Lexington", category: "womens-watches", price: 21995, mrp: 26995 },
    { name: "MK Bradshaw", category: "womens-watches", price: 23995, mrp: 28995 },
    { name: "MK Parker", category: "womens-watches", price: 20995, mrp: 25995 },
    { name: "MK Runway", category: "mens-watches", price: 19995, mrp: 24995 },
  ],
  "armani-exchange": [
    { name: "AX Hampton", category: "mens-watches", price: 13995, mrp: 17995 },
    { name: "AX Banks", category: "mens-watches", price: 14995, mrp: 18995 },
    { name: "AX Drexler", category: "mens-watches", price: 15995, mrp: 19995 },
  ],
  timex: [
    { name: "Timex Weekender", category: "mens-watches", price: 4995, mrp: 6995 },
    { name: "Timex Marlin", category: "mens-watches", price: 9995, mrp: 12995 },
    { name: "Timex Expedition", category: "mens-watches", price: 6995, mrp: 8995 },
    { name: "Timex Q", category: "mens-watches", price: 11995, mrp: 14995 },
  ],
  guess: [
    { name: "Guess Frontier", category: "mens-watches", price: 9995, mrp: 13995 },
    { name: "Guess Letterman", category: "mens-watches", price: 10995, mrp: 14995 },
    { name: "Guess Phoenix", category: "womens-watches", price: 9495, mrp: 12995 },
  ],
  lacoste: [
    { name: "Lacoste 12.12", category: "mens-watches", price: 8995, mrp: 11995 },
    { name: "Lacoste Continental", category: "mens-watches", price: 9995, mrp: 12995 },
    { name: "Lacoste Challenger", category: "mens-watches", price: 8495, mrp: 10995 },
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
