
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const token = authorization.slice(7).trim();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { success: false, message: "Server configuration missing" },
      { status: 503 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, message: "Invalid access token" },
        { status: 401 }
      );
    }

    const { data: isAdmin, error: roleError } =
      await supabase.rpc("is_admin");

    if (roleError || isAdmin !== true) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const db = createServerSupabaseClient();

    const { data: orders, error } = await db
      .from("orders")
      .select(
        "id, customer_name, customer_phone, customer_city, total_amount, payment_method, payment_status, order_status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Admin orders query failed:", error.code);

      return NextResponse.json(
        { success: false, message: "Unable to load orders" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, orders: orders ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Order service unavailable" },
      { status: 503 }
    );
  }
}


export async function PATCH(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const token = authorization.slice(7).trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { success: false, message: "Server configuration missing" },
      { status: 503 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, message: "Invalid access token" },
        { status: 401 }
      );
    }

    const { data: isAdmin, error: roleError } =
      await supabase.rpc("is_admin");

    if (roleError || isAdmin !== true) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const body: unknown = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;
    const orderId = input.order_id;
    const newStatus = input.order_status;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (
      typeof orderId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId) ||
      typeof newStatus !== "string" ||
      !allowedStatuses.includes(newStatus)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid order ID or status" },
        { status: 400 }
      );
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({ order_status: newStatus })
      .eq("id", orderId)
      .select("id, order_status")
      .maybeSingle();

    if (updateError) {
      console.error("Order status update failed:", updateError.code);

      return NextResponse.json(
        { success: false, message: "Unable to update order" },
        { status: 500 }
      );
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, order: updatedOrder },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Order service unavailable" },
      { status: 503 }
    );
  }
}

