export type CartEntry = { productId: number; quantity: number };
export const CART_KEY = "unitshop.customer-cart.v1";
export const MAX_QUANTITY = 99;
export const MAX_ITEMS = 100;
export function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
export function validQuantity(quantity: number) {
  return (
    Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY
  );
}
export function parseCart(raw: string | null): CartEntry[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > MAX_ITEMS)
    throw new Error("Invalid cart");
  const seen = new Set<number>();
  return value.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      !validId(item.productId) ||
      !validQuantity(item.quantity) ||
      seen.has(item.productId)
    )
      throw new Error("Invalid cart");
    seen.add(item.productId);
    return {
      productId: item.productId as number,
      quantity: item.quantity as number,
    };
  });
}
export function addItem(
  entries: CartEntry[],
  product: { id: number; is_active: boolean },
): CartEntry[] {
  if (product.is_active !== true) throw new Error("Inactive product");
  const productId = product.id;
  if (!validId(productId)) throw new Error("Invalid product");
  const existing = entries.find((item) => item.productId === productId);
  if (existing)
    return changeQuantity(entries, productId, existing.quantity + 1);
  if (entries.length >= MAX_ITEMS) throw new Error("Cart limit");
  return [...entries, { productId, quantity: 1 }];
}
export function changeQuantity(
  entries: CartEntry[],
  productId: number,
  quantity: number,
) {
  if (!validQuantity(quantity)) throw new Error("Quantity limit");
  return entries.map((item) =>
    item.productId === productId ? { ...item, quantity } : item,
  );
}
export function removeItem(entries: CartEntry[], productId: number) {
  return entries.filter((item) => item.productId !== productId);
}
export function totalMMK(lines: { price: number; quantity: number }[]) {
  return (
    lines.reduce(
      (sum, line) => sum + Math.round(line.price * 100) * line.quantity,
      0,
    ) / 100
  );
}

export function loadSavedCart(storage: Pick<Storage, "getItem">) {
  return parseCart(storage.getItem(CART_KEY));
}
export function saveCart(
  storage: Pick<Storage, "setItem">,
  entries: CartEntry[],
) {
  // Persist only validated IDs/quantities, never names, prices, credentials or auth state.
  const safeEntries = parseCart(JSON.stringify(entries));
  storage.setItem(CART_KEY, JSON.stringify(safeEntries));
}
