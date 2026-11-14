export type GuestDetails = {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
};
export type FieldError = "required" | "phone" | "tooLong";
export type GuestErrors = Partial<Record<keyof GuestDetails, FieldError>>;
export const FIELD_LIMITS = {
  fullName: 100,
  phone: 40,
  city: 120,
  address: 600,
  notes: 1000,
} as const;
export const EMPTY_GUEST: GuestDetails = {
  fullName: "",
  phone: "",
  city: "",
  address: "",
  notes: "",
};
export function normalizePhone(value: string) {
  return value
    .trim()
    .replace(/[၀-၉]/g, (digit) =>
      String(digit.charCodeAt(0) - "၀".charCodeAt(0)),
    )
    .replace(/[\s()-]/g, "");
}
export function validPhone(value: string) {
  const normalized = normalizePhone(value);
  return (
    /^\+?\d{7,15}$/.test(normalized) &&
    !/^\+?0+$/.test(normalized) &&
    /^[+\d၀-၉\s()-]+$/.test(value.trim())
  );
}
export function validateGuest(details: GuestDetails): GuestErrors {
  const errors: GuestErrors = {};
  for (const field of Object.keys(FIELD_LIMITS) as (keyof GuestDetails)[]) {
    const value = details[field].trim();
    if (field !== "notes" && !value) errors[field] = "required";
    else if (value.length > FIELD_LIMITS[field]) errors[field] = "tooLong";
    else if (field === "phone" && !validPhone(value)) errors[field] = "phone";
  }
  return errors;
}

// Never allow a partial, inactive or stale/mismatched response to enable checkout review.
export function hasVerifiedCart(
  entries: readonly { productId: number; quantity: number }[],
  products: readonly ({
    id: number;
    is_active: boolean;
    price: number;
  } | null)[],
) {
  return (
    entries.length > 0 &&
    entries.length === products.length &&
    entries.every((entry, index) => {
      const product = products[index];
      return (
        Number.isSafeInteger(entry.productId) &&
        entry.productId > 0 &&
        Number.isSafeInteger(entry.quantity) &&
        entry.quantity >= 1 &&
        entry.quantity <= 99 &&
        product?.id === entry.productId &&
        product.is_active === true &&
        Number.isFinite(product.price) &&
        product.price >= 0
      );
    })
  );
}
