// Keep only an opaque idempotency token in this tab's session storage.
// Never persist customer name, address, phone or the order payload here.
export const PENDING_ORDER_KEY = "unitshop.pending-order-idempotency.v1";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AttemptStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readPendingOrderKey(store: AttemptStorage): string | null {
  const key = store.getItem(PENDING_ORDER_KEY);
  return key && UUID.test(key) ? key : null;
}
export function storePendingOrderKey(store: AttemptStorage, key: string) {
  if (!UUID.test(key)) throw new Error("Invalid order request key");
  store.setItem(PENDING_ORDER_KEY, key);
}
export function clearPendingOrderKey(store: AttemptStorage) {
  store.removeItem(PENDING_ORDER_KEY);
}
