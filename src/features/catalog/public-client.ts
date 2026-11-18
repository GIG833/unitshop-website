import { parseProductId, type Catalog, type Product } from "./data";

// Browser shopping reads use the same-origin catalog endpoint, which also
// proxies public Supabase Storage images for networks blocking Supabase.
export async function loadPublicProduct(rawId: string): Promise<Product | null> {
  const id = parseProductId(rawId);
  if (id === null) return null;
  const response = await fetch("/api/catalog", { cache: "no-store" });
  if (!response.ok) throw new Error("Catalog unavailable");
  const catalog: Catalog = await response.json();
  if (!Array.isArray(catalog.products)) throw new Error("Invalid catalog");
  return catalog.products.find((product) => product.id === id && product.is_active === true) ?? null;
}
