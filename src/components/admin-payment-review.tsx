"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
export function AdminPaymentReview({
  orderId,
  method,
  status,
  hasScreenshot,
  onPaymentUpdated,
}: {
  orderId: number;
  method: string;
  status: string;
  hasScreenshot: boolean;
  onPaymentUpdated: (status: string) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const objectUrl = useRef<string | null>(null);
  const working = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);
  async function headers() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token)
      throw new Error("Admin session expired. Sign in again.");
    return { Authorization: `Bearer ${data.session.access_token}` };
  }
  function close() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setImageUrl(null);
  }
  async function view() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/orders/payment-screenshot?order_id=${orderId}`,
        { headers: await headers(), cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(
          "Unable to view screenshot. Check your session and retry.",
        );
      const image = await response.blob();
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(image.type) ||
        image.size <= 0 ||
        image.size > 5 * 1024 * 1024
      )
        throw new Error("Screenshot unavailable.");
      if (!mounted.current) return;
      close();
      const url = URL.createObjectURL(image);
      objectUrl.current = url;
      setImageUrl(url);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Screenshot unavailable.",
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function decide(target: "verified" | "rejected") {
    if (working.current || !imageUrl || status !== "pending") return;
    if (
      !window.confirm(
        `${target === "verified" ? "Verify" : "Reject"} payment for order #${orderId}? Confirm against the merchant transaction record; a screenshot alone is not proof of payment. Order status will not change.`,
      )
    )
      return;
    working.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/orders/payment-status", {
        method: "PATCH",
        headers: { ...(await headers()), "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, payment_status: target }),
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || result.success !== true)
        throw new Error(
          result.message ||
            "Payment update not confirmed. Reload orders before retrying.",
        );
      if (!mounted.current) return;
      onPaymentUpdated(result.order.payment_status);
      setMessage(
        `Payment ${result.order.payment_status}. Order status was not changed.`,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Update outcome unknown. Reload orders before retrying.",
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  if (method !== "MMQR")
    return (
      <p className="mt-2 text-sm text-slate-600">
        Screenshot: not required for COD
      </p>
    );
  return (
    <section
      className="mt-4 border-t pt-4"
      aria-label={`Payment review for order ${orderId}`}
      aria-busy={busy}
    >
      <p className="text-sm text-slate-600">
        Screenshot: {hasScreenshot ? "Available" : "Not submitted"}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!hasScreenshot || busy}
          onClick={() => void view()}
          className="rounded-lg border px-3 py-2 text-sm text-blue-700"
        >
          View screenshot
        </button>
        <button
          type="button"
          disabled={!hasScreenshot || !imageUrl || busy || status !== "pending"}
          onClick={() => void decide("verified")}
          className="rounded-lg bg-green-700 px-3 py-2 text-sm text-white"
        >
          Verify Payment
        </button>
        <button
          type="button"
          disabled={!hasScreenshot || !imageUrl || busy || status !== "pending"}
          onClick={() => void decide("rejected")}
          className="rounded-lg bg-red-700 px-3 py-2 text-sm text-white"
        >
          Reject Payment
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Open the screenshot before deciding. Check the actual merchant
        transaction; viewing never verifies payment automatically.
      </p>
      {busy && <p role="status">Processing…</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-2 text-sm text-green-800">
          {message}
        </p>
      )}
      {imageUrl && (
        <div className="mt-4">
          <button
            type="button"
            onClick={close}
            className="mb-2 text-sm text-blue-700"
          >
            Close screenshot
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Payment evidence for order ${orderId}`}
            referrerPolicy="no-referrer"
            className="max-h-[600px] max-w-full rounded-lg border object-contain"
            onError={() => {
              close();
              setError("Screenshot could not be displayed.");
            }}
          />
        </div>
      )}
    </section>
  );
}
