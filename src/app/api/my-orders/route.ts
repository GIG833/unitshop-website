import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guest = request.cookies.get("unitshop_guest")?.value;
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  if (!guest || !/^[0-9a-f]{64}$/.test(guest)) {
    return NextResponse.json({ success: true, orders: [], sessionMissing: true }, { headers });
  }
  try {
    const db = createServerSupabaseClient();
    const scope = createHash("sha256").update(guest).digest("hex");
    const { data: links, error: linkError } = await db
      .schema("private")
      .from("guest_order_requests")
      .select("order_id")
      .eq("scope_hash", scope)
      .not("order_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (linkError) throw linkError;
    const ids = [...new Set((links ?? []).map((x) => x.order_id).filter((x): x is number => typeof x === "number"))];
    if (ids.length === 0) return NextResponse.json({ success: true, orders: [] }, { headers });
    const { data: orders, error: orderError } = await db
      .from("orders")
      .select("id,created_at,total_amount,payment_method,payment_status,order_status")
      .in("id", ids);
    if (orderError) throw orderError;
    const byId = new Map((orders ?? []).map((order) => [order.id, order]));
    return NextResponse.json({ success: true, orders: ids.map((id) => byId.get(id)).filter(Boolean) }, { headers });
  } catch (error) {
    console.error("Guest orders lookup failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ success: false, message: "Unable to load orders" }, { status: 503, headers });
  }
}
