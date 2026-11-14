import type { SupabaseClient } from "@supabase/supabase-js";

export type Category = { id: number; name_en: string };
export type Product = {
  id: number;
  name_en: string;
  name_mm: string | null;
  price: number;
  category_id: number;
  description_en: string | null;
  description_mm: string | null;
  image_url: string | null;
  is_active: boolean;
};
export type Catalog = { categories: Category[]; products: Product[] };

// SELECT only. Read in bounded pages rather than silently stopping at the API row limit.
export async function loadCatalog(
  client: Pick<SupabaseClient, "from">,
): Promise<Catalog> {
  async function readAll(table: "products" | "categories", columns: string) {
    const rows: Record<string, unknown>[] = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      let query = client.from(table).select(columns);
      if (table === "products") query = query.eq("is_active", true);
      const { data, error } = await query
        .order("id")
        .range(offset, offset + pageSize - 1);
      if (error || !Array.isArray(data))
        throw new Error("Catalogue could not be loaded.");
      for (const row of data as unknown[]) {
        if (!row || typeof row !== "object" || Array.isArray(row))
          throw new Error("Invalid catalogue data.");
        rows.push(row as Record<string, unknown>);
      }
      if (data.length < pageSize) return rows;
    }
  }
  const [categoryRows, productRows] = await Promise.all([
    readAll("categories", "id,name_en"),
    readAll(
      "products",
      "id,name_en,name_mm,price,category_id,description_en,description_mm,image_url,is_active",
    ),
  ]);
  const categories = categoryRows.map((row) => {
    if (typeof row.id !== "number" || typeof row.name_en !== "string")
      throw new Error("Invalid category data.");
    return { id: row.id, name_en: row.name_en };
  });
  const products = productRows
    .filter((row) => row.is_active === true)
    .map((row) => {
      const price = row.price;
      if (
        typeof row.id !== "number" ||
        typeof row.name_en !== "string" ||
        typeof row.category_id !== "number" ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        throw new Error("Invalid product data.");
      }
      return {
        id: row.id,
        name_en: row.name_en,
        category_id: row.category_id,
        price,
        name_mm: typeof row.name_mm === "string" ? row.name_mm : null,
        description_en:
          typeof row.description_en === "string" ? row.description_en : null,
        description_mm:
          typeof row.description_mm === "string" ? row.description_mm : null,
        image_url: safeImageUrl(row.image_url),
        is_active: true,
      };
    });
  return { categories, products };
}

export function localizedText(
  english: string | null,
  myanmar: string | null,
  locale: "en" | "my",
) {
  return (
    (locale === "my"
      ? myanmar?.trim() || english?.trim()
      : english?.trim() || myanmar?.trim()) || ""
  );
}
export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
export function filterProducts(
  products: Product[],
  categoryId: number | "all",
) {
  return products.filter(
    (product) =>
      product.is_active &&
      (categoryId === "all" || product.category_id === categoryId),
  );
}
export function formatPrice(price: number, locale: "en" | "my") {
  return `${new Intl.NumberFormat(locale === "my" ? "my-MM" : "en-US", { maximumFractionDigits: 2 }).format(price)} MMK`;
}
