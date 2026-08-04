"use client";

import { useEffect, useState } from "react";
import { useCatalogStore } from "@/lib/store/catalog";
import { adminModelsToProducts } from "@/lib/adminCatalog";
import type { Product } from "@/lib/types";

/**
 * Admin-added products from this browser's localStorage-backed catalog
 * store, converted to the storefront `Product` shape. Returns an empty
 * array until the store hydrates on the client, so the first render always
 * matches the server-rendered markup (no hydration mismatch).
 */
export function useAdminProducts(): Product[] {
  const models = useCatalogStore((s) => s.models);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated ? adminModelsToProducts(models) : [];
}
