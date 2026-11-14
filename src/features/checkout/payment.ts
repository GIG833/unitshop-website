// Payment preference only. These values do not initiate or confirm payments.
export const PAYMENT_METHODS = ["cod", "mmqr"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "cod" || value === "mmqr";
}
export const PAYMENT_PREVIEW = {
  cod: {
    showQrPlaceholder: false,
    screenshotUploadEnabled: false,
    requiresManualVerification: false,
  },
  mmqr: {
    showQrPlaceholder: true,
    screenshotUploadEnabled: false,
    requiresManualVerification: true,
  },
} as const satisfies Record<
  PaymentMethod,
  {
    showQrPlaceholder: boolean;
    screenshotUploadEnabled: false;
    requiresManualVerification: boolean;
  }
>;
