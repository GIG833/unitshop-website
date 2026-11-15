
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Payment screenshot upload is not enabled yet.",
    },
    { status: 503 }
  );
}
