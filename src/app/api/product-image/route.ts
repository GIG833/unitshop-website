import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PREFIX = "/storage/v1/object/public/";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path || !path.startsWith(PREFIX) || path.length > 2048 ||
      /[\\?#\x00-\x1f]/.test(path) || path.split("/").some((part) => part === "." || part === "..")) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    const baseUrl = new URL(base);
    if (baseUrl.protocol !== "https:") return new NextResponse(null, { status: 503 });
    const target = new URL(path, baseUrl.origin);
    if (target.origin !== baseUrl.origin || !target.pathname.startsWith(PREFIX)) {
      return new NextResponse(null, { status: 400 });
    }
    const upstream = await fetch(target, { signal: AbortSignal.timeout(12000), cache: "force-cache" });
    if (!upstream.ok) return new NextResponse(null, { status: 502 });
    const type = upstream.headers.get("content-type") || "";
    if (!/^image\/(jpeg|png|webp|gif|avif|svg\+xml)(?:;|$)/i.test(type)) {
      return new NextResponse(null, { status: 415 });
    }
    const size = Number(upstream.headers.get("content-length") || "0");
    if (size > 8_000_000) return new NextResponse(null, { status: 413 });
    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength > 8_000_000) return new NextResponse(null, { status: 413 });
    return new NextResponse(bytes, {
      headers: { "Content-Type": type, "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
