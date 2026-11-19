import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status, headers });
}

// The order number is not a secret. The HttpOnly guest cookie and a
// server-side ownership check are required before returning any order data.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))
    return fail("Invalid order", 400);

  const guest = request.cookies.get("unitshop_guest")?.value;
  if (!guest || !/^[0-9a-f]{64}$/.test(guest))
    return fail("Order not found for this browser session", 404);

  try {
    const db = createServerSupabaseClient();
    const scopeHash = createHash("sha256").update(guest).digest("hex");
    const orderId = Number(id);
    const { data: owns, error: ownershipError } = await db.rpc(
      "verify_guest_order_ownership",
      { p_scope_hash: scopeHash, p_order_id: orderId },
    );
    if (ownershipError) return fail("Unable to check order ownership", 503);
    if (owns !== true) return fail("Order not found for this browser session", 404);

    const { data: order, error } = await db
      .from("orders")
      .select("id,created_at,total_amount,payment_method,payment_status,order_status,payment_screenshot_path")
      .eq("id", orderId)
      .maybeSingle();
    if (error) return fail("Unable to load order", 503);
    if (!order) return fail("Order not found", 404);

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          created_at: order.created_at,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          order_status: order.order_status,
          has_payment_screenshot: Boolean(order.payment_screenshot_path),
        },
      },
      { headers },
    );
  } catch {
    return fail("Order service temporarily unavailable", 503);
  }
}
