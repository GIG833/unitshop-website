import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authenticateAdmin, adminError, adminOrderId } from "@/lib/supabase/admin";
import { canChangeOrderStatus, isOrderStatus } from "@/features/admin/order-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const MAX_PATCH_BYTES = 2048;

export async function GET(request: NextRequest) {
  const auth = await authenticateAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    // Use a service-role read only AFTER independently verifying the admin
    // token and is_admin() role. Do not send private screenshot storage paths.
    const db = createServerSupabaseClient();
    const { data: orders, error } = await db
      .from("orders")
      .select(
        "id,customer_name,customer_phone,customer_city,delivery_address,delivery_notes,total_amount,payment_method,payment_status,order_status,created_at,payment_screenshot_path,order_items(product_name,quantity,unit_price,subtotal)",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Admin orders query failed:", error.code);
      return adminError("Unable to load orders", 503);
    }
    return NextResponse.json({
      success: true,
      orders: (orders ?? []).map(({ payment_screenshot_path, ...order }) => ({
        ...order,
        has_payment_screenshot: Boolean(payment_screenshot_path),
      })),
    }, { headers: HEADERS });
  } catch {
    return adminError("Order service unavailable", 503);
  }
}

async function readBoundedJson(request: NextRequest): Promise<unknown> {
  const length = request.headers.get("content-length");
  if (length !== null) {
    const size = Number(length);
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_PATCH_BYTES) {
      throw new Error("Too large");
    }
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_PATCH_BYTES) {
      await reader.cancel();
      throw new Error("Too large");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateAdmin(request);
  if (!auth.ok) return auth.response;
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return adminError("Invalid request origin", 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? ""))
    return adminError("JSON required", 415);

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    return adminError(error instanceof Error && error.message === "Too large" ?
      "Request too large" : "Invalid request", error instanceof Error && error.message === "Too large" ? 413 : 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body))
    return adminError("Invalid request", 400);
  const input = body as Record<string, unknown>;
  const id = adminOrderId(input.order_id);
  const target = input.order_status;
  if (id === null || !isOrderStatus(target) ||
      Object.keys(input).some((key) => key !== "order_id" && key !== "order_status"))
    return adminError("Invalid order status update", 400);

  try {
    // Read using the authenticated, RLS-scoped admin identity, never
    // service_role for status changes.
    const { data: order, error } = await auth.client
      .from("orders")
      .select("id,order_status,payment_method,payment_status")
      .eq("id", id)
      .maybeSingle();
    if (error) return adminError("Unable to check order", 503);
    if (!order) return adminError("Order not found", 404);
    if (!canChangeOrderStatus(
      order.order_status, target, order.payment_method, order.payment_status,
    ))
      return adminError("Invalid transition or unverified MMQR payment. Reload orders.", 409);

    // Compare-and-set prevents a stale admin screen from overriding a
    // concurrent payment or fulfilment change.
    const { data: updated, error: updateError } = await auth.client
      .from("orders")
      .update({ order_status: target })
      .eq("id", id)
      .eq("order_status", order.order_status)
      .eq("payment_method", order.payment_method)
      .eq("payment_status", order.payment_status)
      .select("id,order_status")
      .maybeSingle();
    if (updateError)
      return adminError("Unable to confirm update. Reload orders before retrying.", 503);
    if (!updated)
      return adminError("Order changed during update. Reload orders.", 409);

    return NextResponse.json({ success: true, order: updated }, { headers: HEADERS });
  } catch {
    return adminError("Order service unavailable. Reload orders before retrying.", 503);
  }
}
