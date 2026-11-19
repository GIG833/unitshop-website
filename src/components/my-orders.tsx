"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import type { Locale } from "@/lib/i18n/dictionaries";

type Order = { id: number; created_at: string; total_amount: number; payment_method: string; payment_status: string; order_status: string };
type State = { loading: boolean; orders: Order[]; sessionMissing: boolean; error: boolean };

export function MyOrders({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<State>({ loading: true, orders: [], sessionMissing: false, error: false });
  const my = locale === "my";
  useEffect(() => {
    let active = true;
    fetch("/api/my-orders", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("Failed"); return response.json(); })
      .then((data) => { if (active) setState({ loading: false, orders: data.orders ?? [], sessionMissing: !!data.sessionMissing, error: false }); })
      .catch(() => { if (active) setState({ loading: false, orders: [], sessionMissing: false, error: true }); });
    return () => { active = false; };
  }, [retry]);
  return <>
    <header className="header"><div className="container header-inner">
      <Link href={`/?lang=${locale}`} aria-label="UNITSHOP"><Brand /></Link>
      <div className="language-switch" role="group" aria-label="Language">
        <button aria-pressed={my} onClick={() => setLocale("my")}>မြန်မာ</button>
        <button aria-pressed={!my} onClick={() => setLocale("en")}>EN</button>
      </div>
    </div></header>
    <main className="container product-detail-main">
      <Link className="text-link detail-back" href={`/?lang=${locale}`}>← {my ? "ပင်မစာမျက်နှာ" : "Back to shop"}</Link>
      <h1 className="cart-title">{my ? "ကျွန်ုပ်၏ အော်ဒါများ" : "My Orders"}</h1>
      <p className="checkout-notice">{my ? "ဤ Browser တွင် တင်ခဲ့သော အော်ဒါများကိုသာ ပြသပါသည်။ Browser Data ဖျက်ခြင်း သို့မဟုတ် ဖုန်းပြောင်းခြင်းကြောင့် အော်ဒါများ ပြန်မပေါ်နိုင်ပါ။" : "Orders from this browser's guest session only. Clearing browser data or switching devices may make past orders inaccessible."}</p>
      {state.loading ? <p role="status">{my ? "အော်ဒါများ ရယူနေသည်…" : "Loading orders…"}</p> :
       state.error ? <div role="alert"><p>{my ? "အော်ဒါများ မရယူနိုင်ပါ။" : "Unable to load orders."}</p><button className="button-primary" onClick={() => { setState(s => ({ ...s, loading: true })); setRetry(n => n + 1); }}>{my ? "ထပ်ကြိုးစားရန်" : "Try again"}</button></div> :
       state.orders.length === 0 ? <p role="status">{state.sessionMissing ? (my ? "ဤ Browser တွင် Guest Session မရှိသေးပါ။" : "No guest session found in this browser.") : (my ? "ဤ Session အတွက် အော်ဒါ မတွေ့ပါ။" : "No orders found for this guest session.")}</p> :
       <div className="checkout-grid"><div>{state.orders.map(order => <article className="checkout-form" key={order.id} style={{ marginBottom: 16 }}>
         <h2>{my ? "အော်ဒါ" : "Order"} #{order.id}</h2>
         <p>{new Date(order.created_at).toLocaleString(my ? "my-MM" : "en-GB")}</p>
         <p><strong>{my ? "စုစုပေါင်း" : "Total"}:</strong> {Number(order.total_amount).toLocaleString("en-US")} MMK</p>
         <p><strong>{my ? "ငွေပေးချေမှု" : "Payment"}:</strong> {order.payment_method} · {order.payment_status}</p>
         <p><strong>{my ? "အော်ဒါအခြေအနေ" : "Order status"}:</strong> {order.order_status}</p>
         <Link className="text-link" href={`/orders/confirmation/${order.id}?lang=${locale}`}>{my ? "အော်ဒါအသေးစိတ်ကြည့်ရန် / MMQR ဆက်လုပ်ရန်" : "View order / continue MMQR payment"}</Link>
       </article>)}</div></div>}
    </main>
  </>;
}
