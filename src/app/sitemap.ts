import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";
import { brands } from "@/lib/mock/brands";
import { categories } from "@/lib/mock/categories";
import { products } from "@/lib/mock/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = SITE.url;

  const staticRoutes = [
    "",
    "/about",
    "/why-buy",
    "/offers",
    "/contact",
    "/cart",
    "/legal/terms",
    "/legal/privacy",
    "/legal/shipping",
    "/legal/returns",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  const brandRoutes = brands.map((brand) => ({
    url: `${base}/brand/${brand.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const categoryRoutes = categories.map((category) => ({
    url: `${base}/category/${category.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const productRoutes = products.map((product) => ({
    url: `${base}/product/${product.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...brandRoutes, ...categoryRoutes, ...productRoutes];
}
