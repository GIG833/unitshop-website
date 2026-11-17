import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadCatalog } from "@/features/catalog/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" };
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) throw new Error("Missing public catalog configuration");
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const catalog = await loadCatalog(client);
    const origin = new URL(url).origin;
    const products = catalog.products.map((product) => {
      if (!product.image_url) return product;
      try {
        const image = new URL(product.image_url);
        const prefix = "/storage/v1/object/public/";
        if (image.origin === origin && image.pathname.startsWith(prefix)) {
          return { ...product, image_url: `/api/product-image?path=${encodeURIComponent(image.pathname)}` };
        }
      } catch { /* Preserve the original URL for non-Supabase images. */ }
      return product;
    });
    return NextResponse.json({ ...catalog, products }, { headers });
  } catch (error) {
    console.error("Public catalog fetch failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ message: "Catalog temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
