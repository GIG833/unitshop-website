import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public read only: Supabase RLS only permits viewing active promotions.
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing public Supabase configuration");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client
      .from("promotions")
      .select("id,title_en,title_mm,body_en,body_mm,image_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: false })
      .limit(6);
    if (error) throw error;

    const origin = new URL(url).origin;
    const promotions = (data ?? []).map((promotion) => {
      // Proxy uploaded promotional images through our own domain, as for catalog photos.
      let image_url: string | null = null;
      if (typeof promotion.image_url === "string") {
        try {
          const image = new URL(promotion.image_url);
          const prefix = "/storage/v1/object/public/product-images/promotions/";
          if (image.origin === origin && image.pathname.startsWith(prefix) &&
            !image.pathname.includes("..")) {
            image_url = `/api/product-image?path=${encodeURIComponent(image.pathname)}`;
          }
        } catch { /* Invalid/missing image simply leaves a text-only banner. */ }
      }
      return { ...promotion, image_url };
    });
    return NextResponse.json({ promotions }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Promotions unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
