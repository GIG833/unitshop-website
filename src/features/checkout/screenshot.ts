export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const SCREENSHOT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export function screenshotError(file: {
  size: number;
  type: string;
}): "size" | "type" | null {
  if (file.size <= 0 || file.size > MAX_SCREENSHOT_BYTES) return "size";
  if (!(SCREENSHOT_TYPES as readonly string[]).includes(file.type))
    return "type";
  return null;
}
// Upload retry deliberately has no access to order creation.
export async function uploadScreenshot(
  orderId: string,
  file: File,
  send: typeof fetch = fetch,
) {
  if (!/^[1-9]\d*$/.test(orderId) || screenshotError(file))
    throw new Error("Invalid screenshot request");
  const body = new FormData();
  body.set("screenshot", file);
  const response = await send("/api/orders/payment-screenshot", {
    method: "POST",
    credentials: "same-origin",
    headers: { "x-order-id": orderId },
    body,
  });
  const result: unknown = await response.json();
  if (
    !response.ok ||
    !result ||
    typeof result !== "object" ||
    !("success" in result) ||
    result.success !== true
  )
    throw new Error("Screenshot submission not confirmed");
}
