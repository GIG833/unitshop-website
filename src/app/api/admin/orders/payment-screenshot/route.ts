import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdmin,
  adminError,
  adminOrderId,
  orderScreenshotPath,
} from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const auth = await authenticateAdmin(request);
  if (!auth.ok) return auth.response;
  const id = adminOrderId(request.nextUrl.searchParams.get("order_id"));
  if (id === null) return adminError("Invalid order ID", 400);
  try {
    const { data: order, error } = await auth.client
      .from("orders")
      .select("payment_method,payment_screenshot_path")
      .eq("id", id)
      .maybeSingle();
    if (error) return adminError("Unable to load payment evidence", 503);
    if (!order || order.payment_method !== "MMQR")
      return adminError("MMQR evidence not found", 404);
    const path = orderScreenshotPath(id, order.payment_screenshot_path);
    if (!path) return adminError("Payment screenshot unavailable", 404);
    // Proxy private evidence after server authorization. No signed/public URL is exposed.
    const { data: image, error: storageError } =
      await createServerSupabaseClient()
        .storage.from("payment-screenshots")
        .download(path);
    if (storageError || !image)
      return adminError("Unable to load screenshot; it may be missing", 503);
    if (image.size <= 0 || image.size > 5 * 1024 * 1024)
      return adminError("Screenshot unavailable", 503);
    const extension = path.slice(path.lastIndexOf(".") + 1);
    const contentType =
      extension === "jpg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : "image/webp";
    return new NextResponse(image, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, private",
        "Content-Disposition": `inline; filename="payment-${id}.${extension}"`,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return adminError("Screenshot service unavailable", 503);
  }
}
