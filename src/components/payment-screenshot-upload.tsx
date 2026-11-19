"use client";
import { useRef, useState } from "react";
import {
  screenshotError,
  uploadScreenshot,
} from "@/features/checkout/screenshot";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
export function PaymentScreenshotUpload({
  orderId,
  locale,
  onUploaded,
}: {
  orderId: string;
  locale: Locale;
  onUploaded?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "uploaded" | "error"
  >("idle");
  const [validation, setValidation] = useState<"size" | "type" | null>(null);
  const busy = useRef(false);
  const t = dictionaries[locale];
  async function upload() {
    if (!file || busy.current || status === "uploaded") return;
    const error = screenshotError(file);
    if (error) {
      setValidation(error);
      return;
    }
    busy.current = true;
    setStatus("uploading");
    try {
      await uploadScreenshot(orderId, file);
      setStatus("uploaded");
      onUploaded?.();
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }
  return (
    <section
      className="payment-mmqr-info"
      aria-labelledby="screenshot-heading"
      aria-busy={status === "uploading"}
    >
      <h2 id="screenshot-heading">{t.screenshotTitle}</h2>
      <p className="checkout-help">
        {t.screenshotHelp} #{orderId}
      </p>
      <label htmlFor="payment-screenshot">{t.screenshotSelect}</label>
      <input
        id="payment-screenshot"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={status === "uploading" || status === "uploaded"}
        aria-describedby="screenshot-help screenshot-status"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          const error = selected ? screenshotError(selected) : null;
          setValidation(error);
          setFile(error ? null : selected);
          setStatus("idle");
          if (error) event.target.value = "";
        }}
      />
      <p id="screenshot-help" className="checkout-help">
        {t.screenshotLimits}
      </p>
      {validation && (
        <p role="alert" className="checkout-field-error">
          {validation === "size"
            ? t.screenshotSizeError
            : t.screenshotTypeError}
        </p>
      )}
      <button
        type="button"
        className="button-primary"
        disabled={!file || status === "uploading" || status === "uploaded"}
        onClick={() => void upload()}
      >
        {status === "uploading"
          ? t.screenshotUploading
          : status === "error"
            ? t.screenshotRetry
            : t.screenshotUpload}
      </button>
      <p
        id="screenshot-status"
        role={status === "error" ? "alert" : "status"}
        className={
          status === "error" ? "checkout-field-error" : "checkout-help"
        }
      >
        {status === "uploaded"
          ? t.screenshotSuccess
          : status === "error"
            ? t.screenshotFailure
            : status === "uploading"
              ? t.screenshotUploading
              : t.screenshotWaiting}
      </p>
      <p className="payment-verification">{t.paymentManualVerification}</p>
    </section>
  );
}
