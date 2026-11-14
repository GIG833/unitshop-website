
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

    // Only verified admins can access the service-role client.
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
