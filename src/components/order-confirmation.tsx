"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { PaymentScreenshotUpload } from "@/components/payment-screenshot-upload";
import { formatPrice } from "@/features/catalog/data";
import type { Locale } from "@/lib/i18n/dictionaries";

type Order = {
  id: number;
  created_at: string;
  total_amount: number;
  payment_method: "COD" | "MMQR";
  payment_status: string;
  order_status: string;
  has_payment_screenshot: boolean;
};
type State =
  | { status: "loading" | "error" | "not-found" }
  | { status: "ready"; order: Order };

export function OrderConfirmation({
  id,
  initialLocale,
}: {
  id: string;
  initialLocale: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [state, setState] = useState<State>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const my = locale === "my";

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
        if (active) setState({ status: "not-found" });
        return;
      }
      try {
        const response = await fetch(`/api/orders/${id}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.status === 404) {
          if (active) setState({ status: "not-found" });
          return;
        }
        if (!response.ok) throw new Error("Unable to load order");
        const body = await response.json();
        const order = body.order as Order | undefined;
        if (
          body.success !== true ||
          !order ||
          order.id !== Number(id) ||
          !Number.isFinite(order.total_amount) ||
          order.total_amount < 0 ||
          !["COD", "MMQR"].includes(order.payment_method) ||
          typeof order.has_payment_screenshot !== "boolean"
        ) throw new Error("Invalid order response");
        if (active) setState({ status: "ready", order });
      } catch {
        if (active) setState({ status: "error" });
      }
    }
    void load();
    return () => { active = false; };
  }, [id, retry]);

  const refresh = () => {
    setState({ status: "loading" });
    setRetry((value) => value + 1);
  };
  const order = state.status === "ready" ? state.order : null;
  const canUpload = order?.payment_method === "MMQR" &&
    order.payment_status === "pending" &&
    order.order_status === "pending" &&
    !order.has_payment_screenshot;

  return (
    <>
      <a className="skip-link" href="#confirmation-main">
        {my ? "အော်ဒါ အချက်အလက်သို့ သွားရန်" : "Skip to order"}
      </a>
      <header className="header">
        <div className="container header-inner">
          <Link href={`/?lang=${locale}`} aria-label="UNITSHOP"><Brand /></Link>
          <div className="language-switch" role="group" aria-label="Language">
            <button lang="my" aria-pressed={my} onClick={() => setLocale("my")}>မြန်မာ</button>
            <button lang="en" aria-pressed={!my} onClick={() => setLocale("en")}>EN</button>
          </div>
        </div>
      </header>
      <main id="confirmation-main" className="container product-detail-main">
        <Link className="text-link detail-back" href={`/my-orders?lang=${locale}`}>
          ← {my ? "ကျွန်ုပ်၏ အော်ဒါများ" : "My Orders"}
        </Link>
        <h1 className="cart-title">{my ? "အော်ဒါ အတည်ပြုချက်" : "Order confirmation"}</h1>
        {state.status === "loading" && <p className="catalog-state" role="status">
          {my ? "အော်ဒါ အချက်အလက် ရယူနေပါသည်…" : "Loading your order…"}
        </p>}
        {state.status === "not-found" && <div className="catalog-state" role="alert">
          <p>{my ? "ဤ Browser Session မှာ အော်ဒါကို ရှာမတွေ့ပါ။ အခြား Browser သို့မဟုတ် ဖုန်းမှ ဖွင့်ထားခြင်းလည်း ဖြစ်နိုင်ပါသည်။" : "This order is not available in this browser session. It may belong to a different browser or device."}</p>
          <p>{my ? "ငွေချေပြီးသားဖြစ်ပါက အော်ဒါအသစ် မတင်ဘဲ ဆိုင်ကို ဆက်သွယ်ပါ။" : "If you have already paid, contact the shop instead of placing another order."}</p>
        </div>}
        {state.status === "error" && <div className="catalog-state" role="alert">
          <p>{my ? "အော်ဒါ အချက်အလက်ကို ယခု မရယူနိုင်သေးပါ။ ထပ်မံကြိုးစားပါ။ အော်ဒါအသစ် ထပ်မတင်ပါနှင့်။" : "Unable to load your order. Please retry; do not place another order."}</p>
          <button type="button" className="button-primary" onClick={refresh}>{my ? "ထပ်မံစစ်ဆေးရန်" : "Retry"}</button>
        </div>}
        {order && <div className="checkout-grid">
          <section className="checkout-form" aria-labelledby="receipt-title">
            <h2 id="receipt-title">{my ? "အော်ဒါတင်ပြီးပါပြီ" : "Your order has been placed"}</h2>
            <p>{my ? "အော်ဒါနံပါတ်" : "Order number"}: <strong>#{order.id}</strong></p>
            <p>{my ? "ပစ္စည်းတန်ဖိုး" : "Products total"}: <strong>{formatPrice(order.total_amount, locale)}</strong></p>
            <p>{my ? "ငွေပေးချေမှုနည်းလမ်း" : "Payment method"}: <strong>{order.payment_method}</strong></p>
            <p>{my ? "ငွေပေးချေမှုအခြေအနေ" : "Payment status"}: <strong>{order.payment_status}</strong></p>
            <p>{my ? "အော်ဒါအခြေအနေ" : "Order status"}: <strong>{order.order_status}</strong></p>
            <p className="checkout-help">
              {my ? "ပို့ဆောင်ခကို ဤပစ္စည်းတန်ဖိုးတွင် မထည့်သွင်းထားပါ။" : "Delivery fees are not included in this products total."}
            </p>
            {order.payment_method === "COD" && <p className="checkout-notice">
              {my ? "COD ကို ရွေးထားပါသည်။ ပစ္စည်းပို့ဆောင်ချိန်တွင် ငွေချေနိုင်ပါသည်။" : "Cash on Delivery selected. Pay when your order is delivered."}
            </p>}
            {order.payment_method === "MMQR" && (
              <>
                {order.payment_status === "verified" && <p className="checkout-notice">
                  {my ? "ငွေပေးချေမှုကို Admin က အတည်ပြုပြီးပါပြီ။" : "An admin has verified your payment."}
                </p>}
                {order.payment_status === "rejected" && <p className="checkout-notice">
                  {my ? "ငွေပေးချေမှုကို အတည်မပြုနိုင်သေးပါ။ အော်ဒါအသစ် ထပ်မတင်ဘဲ ဆိုင်ကို ဆက်သွယ်ပါ။" : "Payment was not verified. Please contact the shop before placing any new order."}
                </p>}
                {order.has_payment_screenshot && order.payment_status === "pending" && <p className="checkout-notice">
                  {my ? "ငွေချေ Screenshot ကို လက်ခံရရှိထားပါသည်။ Admin က အမှန်တကယ် ငွေဝင်မှုကို စစ်ဆေးပြီးမှ အတည်ပြုပါမည်။" : "Your screenshot was received. Payment is pending manual verification against the merchant transaction."}
                </p>}
                {canUpload && (
                  <section aria-labelledby="mmqr-heading">
                    <h2 id="mmqr-heading">{my ? "MMQR ငွေပေးချေရန်" : "MMQR payment"}</h2>
                    <p className="checkout-help">
                      {my ? "ဆိုင်၏ ငွေလက်ခံအကောင့်ကို မပေးချေမီ စစ်ဆေးပါ။ အော်ဒါနံပါတ်ကို မှတ်ထားပြီး ငွေချေ Screenshot တင်ပေးပါ။" : "Check the merchant payee before paying. Keep your order number, then upload your payment screenshot."}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/unitshop-mmqr.JPG" alt="Merchant MMQR payment QR" width={320} height={320} style={{ maxWidth: "100%", height: "auto", display: "block", margin: "16px auto" }} />
                    <PaymentScreenshotUpload
                      orderId={String(order.id)}
                      locale={locale}
                      onUploaded={refresh}
                    />
                  </section>
                )}
                {!canUpload && !order.has_payment_screenshot &&
                  order.payment_status === "pending" && (
                    <p className="checkout-notice">
                      {my ? "ဤအော်ဒါအတွက် Screenshot တင်၍မရတော့ပါ။ ဆိုင်ကို ဆက်သွယ်ပါ။" : "Screenshot submission is not available for this order. Contact the shop."}
                    </p>
                  )}
              </>
            )}
            <div className="hero-links">
              <Link className="text-link" href={`/my-orders?lang=${locale}`}>
                {my ? "ကျွန်ုပ်၏ အော်ဒါများ ကြည့်ရန်" : "View My Orders"}
              </Link>
              <Link className="text-link" href={`/?lang=${locale}#featured`}>
                {my ? "ဆက်လက်ဈေးဝယ်ရန်" : "Continue shopping"}
              </Link>
            </div>
          </section>
        </div>}
      </main>
    </>
  );
}
