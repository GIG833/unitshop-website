import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdmin,
  adminError,
  adminOrderId,
  orderScreenshotPath,
} from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function PATCH(request: NextRequest) {
  const auth = await authenticateAdmin(request);
  if (!auth.ok) return auth.response;
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return adminError("Invalid request origin", 403);
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  )
    return adminError("JSON required", 415);
  let input: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return adminError("Invalid request", 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        return adminError("Request too large", 413);
      }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return adminError("Invalid request", 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input))
    return adminError("Invalid request", 400);
  const body = input as Record<string, unknown>;
  const id = adminOrderId(body.order_id);
  const target = body.payment_status;
  if (
    id === null ||
    (target !== "verified" && target !== "rejected") ||
    Object.keys(body).some(
      (key) => key !== "order_id" && key !== "payment_status",
    )
  )
    return adminError("Invalid payment decision", 400);
  try {
    const { data: order, error } = await auth.client
      .from("orders")
      .select("payment_method,payment_status,payment_screenshot_path")
      .eq("id", id)
      .maybeSingle();
    if (error) return adminError("Unable to check payment", 503);
    if (!order) return adminError("Order not found", 404);
    const path = orderScreenshotPath(id, order.payment_screenshot_path);
    if (
      order.payment_method !== "MMQR" ||
      order.payment_status !== "pending" ||
      !path
    )
      return adminError(
        "Only pending MMQR payments with screenshots can be reviewed",
        409,
      );
    const evidence = await createServerSupabaseClient()
      .storage.from("payment-screenshots")
      .download(path);
    if (
      evidence.error ||
      !evidence.data ||
      evidence.data.size <= 0 ||
      evidence.data.size > 5 * 1024 * 1024
    )
      return adminError(
        "Screenshot cannot be read; payment was not changed",
        503,
      );
    // Use the authenticated admin's RLS-scoped client, not service-role writes.
    const { data: updated, error: updateError } = await auth.client
      .from("orders")
      .update({ payment_status: target })
      .eq("id", id)
      .eq("payment_method", "MMQR")
      .eq("payment_status", "pending")
      .eq("payment_screenshot_path", path)
      .select("id,payment_status")
      .maybeSingle();
    if (updateError)
      return adminError(
        "Unable to confirm payment update. Reload orders before retrying.",
        503,
      );
    if (!updated)
      return adminError("Payment changed during review. Reload orders.", 409);
    return NextResponse.json(
      { success: true, order: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return adminError(
      "Payment service unavailable. Reload orders before retrying.",
      503,
    );
  }
}
