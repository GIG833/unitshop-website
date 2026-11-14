
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const COOKIE_NAME = "unitshop_guest";
const MAX_BODY_BYTES = 16_384;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function validText(value: unknown, max: number, optional = false) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length > max || (!optional && !text)) return null;
  return text;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return fail("Invalid request origin", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return fail("JSON required", 415);
  }

  let body: unknown;

  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return fail("Request too large", 413);
    }
    body = JSON.parse(raw);
  } catch {
    return fail("Invalid JSON", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail("Invalid order", 400);
  }

  const data = body as Record<string, unknown>;

  const customer_name = validText(data.customer_name, 150);
  const customer_phone = validText(data.customer_phone, 40);
  const customer_city = validText(data.customer_city, 150);
  const delivery_address = validText(data.delivery_address, 500);
  const delivery_notes = validText(data.delivery_notes ?? "", 1000, true);

  if (
    customer_name === null ||
    customer_phone === null ||
    customer_city === null ||
    delivery_address === null ||
    delivery_notes === null
  ) {
    return fail("Invalid customer information", 400);
  }

  const payment_method =
    data.payment_method === "cod"
      ? "COD"
      : data.payment_method === "mmqr"
        ? "MMQR"
        : null;

  if (!payment_method) {
    return fail("Invalid payment method", 400);
  }

  if (!Array.isArray(data.items) ||
      data.items.length < 1 ||
      data.items.length > 50) {
    return fail("Invalid cart", 400);
  }

  const quantities = new Map<string, number>();

  for (const item of data.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return fail("Invalid item", 400);
    }

    const row = item as Record<string, unknown>;
    const rawId = row.product_id;

    const id =
      typeof rawId === "number" && Number.isSafeInteger(rawId)
        ? String(rawId)
        : typeof rawId === "string"
          ? rawId
          : "";

    const quantity = row.quantity;

    if (
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(Number(id)) ||
      !Number.isInteger(quantity) ||
      (quantity as number) < 1 ||
      (quantity as number) > 99
    ) {
      return fail("Invalid item quantity or product", 400);
    }

    const next = (quantities.get(id) ?? 0) + (quantity as number);

    if (next > 99) {
      return fail("Product quantity exceeds limit", 400);
    }

    quantities.set(id, next);
  }

  const items = [...quantities.entries()]
    .map(([product_id, quantity]) => ({ product_id, quantity }))
    .sort((a, b) => Number(a.product_id) - Number(b.product_id));

  const key = data.idempotency_key;

  if (
    typeof key !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
  ) {
    return fail("Invalid request key", 400);
  }

  const order = {
    customer_name,
    customer_phone,
    customer_city,
    delivery_address,
    delivery_notes,
    payment_method,
    items,
  };

  const requestHash = hash(JSON.stringify(order));

 
const guest = request.cookies.get(COOKIE_NAME)?.value;

if (!guest || !/^[0-9a-f]{64}$/.test(guest)) {
  return fail("Guest session required", 401);
}


  const scopeHash = hash(guest);
  const responseCookie = guest;

  try {
    const supabase = createServerSupabaseClient();

    const { data: receipt, error } = await supabase.rpc(
      "create_guest_order",
      {
        p_scope_hash: scopeHash,
        p_idempotency_key: key,
        p_request_hash: requestHash,
        p_order: order,
      }
    );

    if (error) {
      console.error("Order creation failed:", error.code);

      if (error.message.includes("Idempotency key conflict")) {
        return fail("Request key already used for another order", 409);
      }

      return fail("Unable to create order", 400);
    }

    const response = NextResponse.json(
      { success: true, receipt },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );

    response.cookies.set(COOKIE_NAME, responseCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return fail("Order service temporarily unavailable", 503);
  }
}
