
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { success: false, message: "Invalid origin" },
      { status: 403 }
    );
  }

  const existing = request.cookies.get("unitshop_guest")?.value;

  const guest =
    existing && /^[0-9a-f]{64}$/.test(existing)
      ? existing
      : randomBytes(32).toString("hex");

  const response = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  response.cookies.set("unitshop_guest", guest, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
