/**
 * Regenerates the shipped catalogue from a backup file.
 *
 *   npm run snapshot:from-backup -- ./horology365-backup-2026-08-25.json
 *
 * The snapshot is what customers see when the database cannot answer, so it
 * has to be refreshed whenever the real catalogue changes materially. Photos
 * are written out as real files rather than embedded, so pages stay small.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run snapshot:from-backup -- <backup.json>");
  process.exit(1);
}

interface BackupProduct {
  slug: string; title: string; description: string;
  brand_slug: string; category_slug: string; price: number; mrp: number;
  images: { url: string; alt?: string }[];
  rating?: number; review_count?: number; stock?: number;
  is_preorder?: boolean; is_featured?: boolean; tags?: string[];
  deleted_at?: string | null;
}

const backup = JSON.parse(readFileSync(file, "utf8")) as { products: BackupProduct[] };
const dir = join("public", "catalogue");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const products = backup.products
  .filter((p) => !p.deleted_at)
  .map((p) => ({
    id: p.slug,
    slug: p.slug,
    title: p.title,
    description: p.description,
    brandSlug: p.brand_slug,
    categorySlug: p.category_slug,
    price: p.price,
    mrp: p.mrp,
    images: p.images.map((im, i) => {
      if (!im.url.startsWith("data:")) return { url: im.url, alt: im.alt ?? p.title };
      const [head, data] = im.url.split(",");
      const ext = /jpe?g/.test(head!) ? "jpg" : (head!.split("/")[1] ?? "png").split(";")[0]!;
      const name = `${p.slug}-${i}.${ext}`;
      writeFileSync(join(dir, name), Buffer.from(data!, "base64"));
      return { url: `/catalogue/${name}`, alt: im.alt ?? p.title };
    }),
    rating: p.rating ?? 0,
    reviewCount: p.review_count ?? 0,
    stock: p.stock ?? 0,
    isPreorder: Boolean(p.is_preorder),
    isFeatured: Boolean(p.is_featured),
    tags: p.tags ?? [],
  }));

writeFileSync("src/lib/data/catalogueSnapshot.json", `${JSON.stringify(products, null, 2)}\n`);
console.log(`Snapshot written: ${products.length} products, photos in ${dir}`);
