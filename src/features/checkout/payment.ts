// Checkout display capabilities only. Payment verification remains an admin action.
export const PAYMENT_METHODS = ["cod", "mmqr"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "cod" || value === "mmqr";
}
export const PAYMENT_PREVIEW = {
  cod: {
    showPostOrderInstructions: false,
    screenshotUploadEnabled: false,
    requiresManualVerification: false,
  },
  mmqr: {
    showPostOrderInstructions: true,
    screenshotUploadEnabled: true,
    requiresManualVerification: true,
  },
} as const satisfies Record<
  PaymentMethod,
  {
    showPostOrderInstructions: boolean;
    screenshotUploadEnabled: boolean;
    requiresManualVerification: boolean;
  }
>;
