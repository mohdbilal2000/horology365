import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/data/products";
import { getBrandBySlug } from "@/lib/data/brands";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const products = await searchProducts(q);

  const results = await Promise.all(
    products.slice(0, 8).map(async (product) => ({
      ...product,
      brandName: (await getBrandBySlug(product.brandSlug))?.name ?? "",
    })),
  );

  return NextResponse.json({ results });
}
