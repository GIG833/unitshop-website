
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const COOKIE_NAME = "unitshop_guest";
const MAX_BODY_SIZE = 6 * 1024 * 1024;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function fail(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return fail("Invalid request origin", 403);
  }

  const guest = request.cookies.get(COOKIE_NAME)?.value;

  if (!guest || !/^[0-9a-f]{64}$/.test(guest)) {
    return fail("Guest session required", 401);
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!/^multipart\/form-data(?:\s*;|$)/i.test(contentType)) {
    return fail("Form data required", 415);
  }

  const orderIdText = request.headers.get("x-order-id");

  if (
    !orderIdText ||
    !/^[1-9]\d*$/.test(orderIdText) ||
    !Number.isSafeInteger(Number(orderIdText))
  ) {
    return fail("Invalid order ID", 400);
  }

  const orderId = Number(orderIdText);
  const scopeHash = hash(guest);

  try {
    const supabase = createServerSupabaseClient();

    // Verify guest ownership.
    const { data: ownsOrder, error: ownershipError } =
      await supabase.rpc("verify_guest_order_ownership", {
        p_scope_hash: scopeHash,
        p_order_id: orderId,
      });

    if (ownershipError) {
      console.error(
        "Order ownership verification failed:",
        ownershipError.code
      );
      return fail("Unable to verify order", 503);
    }

    if (ownsOrder !== true) {
      return fail("Order not found", 404);
    }

    // Check payment eligibility.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "payment_method, payment_status, payment_screenshot_path, order_status"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      return fail("Unable to check payment", 503);
    }

    if (!order || order.payment_method !== "MMQR") {
      return fail("MMQR order required", 400);
    }

    if (order.order_status !== "pending") {
      return fail("Order is not pending", 409);
    }

    if (order.payment_status !== "pending") {
      return fail("Payment is not pending", 409);
    }

    if (order.payment_screenshot_path) {
      return fail("Payment screenshot already submitted", 409);
    }

    // Limit request size.
    const lengthHeader = request.headers.get("content-length");

    if (lengthHeader !== null) {
      const length = Number(lengthHeader);

      if (
        !Number.isSafeInteger(length) ||
        length <= 0 ||
        length > MAX_BODY_SIZE
      ) {
        return fail("Invalid upload size", 413);
      }
    }

    const reader = request.body?.getReader();

    if (!reader) {
      return fail("Upload body required", 400);
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_BODY_SIZE) {
        await reader.cancel();
        return fail("Upload request too large", 413);
      }

      chunks.push(value);
    }

    // Parse bounded multipart body.
    const boundedRequest = new Request(request.url, {
      method: "POST",
      headers: {
        "content-type": contentType,
      },
      body: Buffer.concat(
        chunks.map((chunk) => Buffer.from(chunk))
      ),
    });

    const formData = await boundedRequest.formData();
    const file = formData.get("screenshot");

    if (!(file instanceof File)) {
      return fail("Screenshot file required", 400);
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return fail("Screenshot must be 5MB or smaller", 413);
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return fail("Unsupported screenshot format", 415);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Check image file signature.
    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isPng =
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      );

    const isWebp =
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";

    const validSignature =
      (file.type === "image/jpeg" && isJpeg) ||
      (file.type === "image/png" && isPng) ||
      (file.type === "image/webp" && isWebp);

    if (!validSignature) {
      return fail("Invalid image file", 415);
    }

    const extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";

    const storagePath =
      `orders/${orderId}/${randomUUID()}.${extension}`;

    // Upload screenshot to private storage.
    const { error: uploadError } = await supabase.storage
      .from("payment-screenshots")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error(
        "Payment screenshot upload failed:",
        uploadError.message
      );

      return fail("Unable to upload screenshot", 503);
    }

    // Save path only if order is still eligible.
    const { data: updatedOrder, error: updateError } =
      await supabase
        .from("orders")
        .update({
          payment_screenshot_path: storagePath,
        })
        .eq("id", orderId)
        .eq("payment_method", "MMQR")
        .eq("payment_status", "pending")
        .eq("order_status", "pending")
        .is("payment_screenshot_path", null)
        .select("id")
        .maybeSingle();

    if (updateError || !updatedOrder) {
      console.error(
        "Screenshot database update not confirmed:",
        updateError?.code ?? "No matching order",
        storagePath
      );

      return fail(
        "Unable to confirm payment screenshot submission",
        503
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payment screenshot submitted",
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Payment screenshot processing failed:",
      error
    );

    return fail(
      "Payment screenshot processing temporarily unavailable",
      503
    );
  }
}
