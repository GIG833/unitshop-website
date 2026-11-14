"use client";
import {
  PAYMENT_METHODS,
  PAYMENT_PREVIEW,
  type PaymentMethod,
} from "@/features/checkout/payment";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export function PaymentSelection({
  method,
  onChange,
  locale,
  invalid,
}: {
  method: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  locale: Locale;
  invalid: boolean;
}) {
  const t = dictionaries[locale];
  const preview = method ? PAYMENT_PREVIEW[method] : null;
  return (
    <fieldset
      className="payment-selection"
      aria-describedby={`payment-preview-note${invalid ? " payment-selection-error" : ""}`}
    >
      <legend>{t.paymentTitle}</legend>
      <p className="checkout-help" id="payment-preview-note">
        {t.paymentPreview}
      </p>
      <div className="payment-options">
        {PAYMENT_METHODS.map((option) => (
          <label className="payment-option" key={option}>
            <input
              id={`payment-${option}`}
              type="radio"
              name="paymentMethod"
              value={option}
              checked={method === option}
              onChange={() => onChange(option)}
              required
              aria-describedby={invalid ? "payment-selection-error" : undefined}
            />
            <span>
              <strong>{option === "cod" ? t.paymentCod : t.paymentMmqr}</strong>
              <span>
                {option === "cod" ? t.paymentCodHelp : t.paymentMmqrHelp}
              </span>
            </span>
          </label>
        ))}
      </div>
      {invalid && (
        <p
          className="checkout-field-error"
          id="payment-selection-error"
          role="alert"
        >
          {t.paymentRequired}
        </p>
      )}
      {method === "cod" && (
        <p className="payment-guidance">{t.paymentCodNoScreenshot}</p>
      )}
      {preview?.showQrPlaceholder && (
        <div className="payment-mmqr-info">
          <div
            className="merchant-qr-placeholder"
            role="img"
            aria-label={t.paymentQrPlaceholder}
          >
            <span aria-hidden="true">QR</span>
            <p>{t.paymentQrPlaceholder}</p>
          </div>
          <p className="payment-guidance">{t.paymentScreenshotLater}</p>
          {preview.requiresManualVerification && (
            <p className="payment-verification">
              {t.paymentManualVerification}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
