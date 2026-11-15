import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export function adminError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function authenticateAdmin(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ") || !header.slice(7).trim())
    return { ok: false as const, response: adminError("Unauthorized", 401) };
  const token = header.slice(7).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    return {
      ok: false as const,
      response: adminError("Service unavailable", 503),
    };
  try {
    const client = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user)
      return {
        ok: false as const,
        response: adminError("Invalid access token", 401),
      };
    const role = await client.rpc("is_admin");
    if (role.error)
      return {
        ok: false as const,
        response: adminError("Unable to verify admin access", 503),
      };
    if (role.data !== true)
      return {
        ok: false as const,
        response: adminError("Admin access required", 403),
      };
    return { ok: true as const, client };
  } catch {
    return {
      ok: false as const,
      response: adminError("Service unavailable", 503),
    };
  }
}
export function adminOrderId(value: unknown): number | null {
  const id =
    typeof value === "string" && /^[1-9]\d*$/.test(value)
      ? Number(value)
      : value;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}
export function orderScreenshotPath(
  orderId: number,
  path: unknown,
): string | null {
  if (typeof path !== "string") return null;
  return new RegExp(
    `^orders/${orderId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`,
  ).test(path)
    ? path
    : null;
}
