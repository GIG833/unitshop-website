"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AdminPaymentReview } from "@/components/admin-payment-review";
import { availableOrderTransitions, canChangeOrderStatus } from "@/features/admin/order-workflow";

type AdminOrder = {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  delivery_address: string | null;
  delivery_notes: string | null;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  has_payment_screenshot: boolean;
  order_status: string;
  created_at: string;
  order_items?: Array<{product_name: string;quantity: number;unit_price: number;subtotal: number}>;
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) {
          if (active) router.replace("/admin/login");
          return;
        }
        const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
        if (roleError || isAdmin !== true) {
          if (active) router.replace("/admin/login");
          return;
        }
        if (active) setAuthorized(true);
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session.session?.access_token)
          throw new Error("Admin session expired");
        const response = await fetch("/api/admin/orders", {
          headers: { Authorization: `Bearer ${session.session.access_token}` },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok || result.success !== true || !Array.isArray(result.orders))
          throw new Error(result.message || "Unable to load orders");
        if (active) setOrders(result.orders);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load orders");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router, refreshKey]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      [order.id, order.customer_name, order.customer_phone, order.customer_city,
        order.order_status, order.payment_method].some((value) =>
        String(value ?? "").toLowerCase().includes(query),
      ),
    );
  }, [orders, search]);

  async function updateOrderStatus(id: number, next: string) {
    if (updatingId !== null) return;
    const order = orders.find((entry) => entry.id === id);
    if (!order || !canChangeOrderStatus(
      order.order_status, next, order.payment_method, order.payment_status,
    )) return;

    if (!window.confirm(`Change order #${id} from ${order.order_status} to ${next}?`)) return;
    setUpdatingId(id);
    setUpdateError("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token)
        throw new Error("Admin session expired. Sign in again.");
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order_id: id, order_status: next }),
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || result.success !== true)
        throw new Error(result.message || "Unable to confirm status update");
      setOrders((current) => current.map((item) =>
        item.id === id ? { ...item, order_status: result.order.order_status } : item,
      ));
    } catch (cause) {
      setUpdateError(cause instanceof Error ? cause.message : "Status update outcome unknown");
      setRefreshKey((n) => n + 1);
    } finally {
      setUpdatingId(null);
    }
  }

  if (!authorized) return <main className="min-h-screen flex items-center justify-center">
    Checking admin access...
  </main>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <Link href="/admin" className="text-sm text-blue-700">← Admin Dashboard</Link>
        <h1 className="text-2xl font-bold text-blue-700 sm:text-3xl">Order Management</h1>
        <p className="text-sm text-slate-600">
          Latest 50 orders. Search filters only these loaded orders, not the complete database.
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="flex-1 min-w-48 text-sm font-medium text-slate-800">
            Search loaded orders
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order ID, name, phone or status"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3"
            />
          </label>
          <button
            type="button"
            onClick={() => setRefreshKey((n) => n + 1)}
            disabled={loading || updatingId !== null}
            className="self-end rounded-lg border border-blue-600 px-4 py-3 text-sm font-medium text-blue-700 disabled:opacity-50"
          >Refresh orders</button>
        </div>

        {updateError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{updateError}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <section className="space-y-4" aria-busy={loading}>
          {loading ? <p role="status">Loading orders...</p> :
           error ? null :
           filteredOrders.length === 0 ? <p>No matching orders in the latest 50.</p> :
           filteredOrders.map((order) => {
            const transitions = availableOrderTransitions(
              order.order_status, order.payment_method, order.payment_status,
            );
            return (
              <article key={order.id} className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Order #{order.id} — {order.customer_name}
                    </h2>
                    <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <label className="text-sm font-medium text-slate-700">
                    Fulfilment status
                    <select
                      aria-label={`Order #${order.id} fulfilment status`}
                      value={order.order_status}
                      disabled={updatingId !== null || transitions.length === 0}
                      onChange={(event) => void updateOrderStatus(order.id, event.target.value)}
                      className="mt-1 block rounded-lg border border-slate-300 bg-white p-2 text-sm"
                    >
                      <option value={order.order_status}>{order.order_status}</option>
                      {transitions.map((next) => <option key={next} value={next}>{next}</option>)}
                    </select>
                  </label>
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="font-semibold">Phone</dt><dd className="break-words">{order.customer_phone}</dd></div>
                  <div><dt className="font-semibold">City / Township</dt><dd className="break-words">{order.customer_city}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-semibold">Delivery address</dt><dd className="whitespace-pre-wrap break-words">{order.delivery_address || "Not provided"}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-semibold">Delivery notes</dt><dd className="whitespace-pre-wrap break-words">{order.delivery_notes || "None"}</dd></div>
                  <div><dt className="font-semibold">Products total</dt><dd>{Number(order.total_amount).toLocaleString("en-US")} Ks</dd></div>
                  <div><dt className="font-semibold">Payment</dt><dd>{order.payment_method} · {order.payment_status}</dd></div>
                </dl>
                <section className="mt-4 border-t border-slate-200 pt-4">
                  <h3 className="font-semibold text-slate-900">Ordered Products</h3>
                  {Array.isArray(order.order_items) && order.order_items.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {order.order_items.map((item, index) => (
                        <li key={index} className="rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-medium break-words">{item.product_name}</p>
                          <p className="text-slate-600">
                            {item.quantity} × {Number(item.unit_price).toLocaleString("en-US")} Ks
                            {" · "}Subtotal: {Number(item.subtotal).toLocaleString("en-US")} Ks
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-2 text-sm text-slate-600">No order item details found.</p>}
                </section>
                {order.payment_method === "MMQR" && order.payment_status !== "verified" && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    MMQR payment is not verified. Do not confirm or fulfil this order until the merchant transaction has been checked.
                  </p>
                )}
                <AdminPaymentReview
                  orderId={order.id}
                  method={order.payment_method}
                  status={order.payment_status}
                  hasScreenshot={order.has_payment_screenshot}
                  onPaymentUpdated={(paymentStatus) =>
                    setOrders((current) => current.map((item) =>
                      item.id === order.id ? { ...item, payment_status: paymentStatus } : item,
                    ))
                  }
                />
              </article>
            );
           })}
        </section>
      </div>
    </main>
  );
}
