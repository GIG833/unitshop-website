// Pure, shared business rules. Keep the server authoritative even if the UI
// is bypassed. Payment status is independent of fulfilment/order status.
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value);
}

export function availableOrderTransitions(
  current: unknown,
  paymentMethod: unknown,
  paymentStatus: unknown,
): OrderStatus[] {
  if (!isOrderStatus(current)) return [];
  // Never fulfil an unpaid MMQR order. Cancellation remains possible
  // before shipping, including after a rejected payment.
  if (paymentMethod === "MMQR" && paymentStatus !== "verified") {
    return transitions[current].filter((next) => next === "cancelled");
  }
  if (paymentMethod !== "MMQR" && paymentMethod !== "COD") return [];
  return [...transitions[current]];
}

export function canChangeOrderStatus(
  current: unknown,
  next: unknown,
  paymentMethod: unknown,
  paymentStatus: unknown,
): boolean {
  return isOrderStatus(next) &&
    availableOrderTransitions(current, paymentMethod, paymentStatus).includes(next);
}
