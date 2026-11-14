
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Order API is not configured yet",
    },
    { status: 503 }
  );
}
