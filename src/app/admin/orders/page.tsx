
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AdminOrdersPage() {
  
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  
const [orders, setOrders] = useState<
  Array<{
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_city: string;
    total_amount: number;
    payment_method: string;
    payment_status: string;
    order_status: string;
    created_at: string;
  }>
>([]);

const [loadingOrders, setLoadingOrders] = useState(true);
const [ordersError, setOrdersError] = useState("");


  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (userError || !userData.user) {
        router.replace("/admin/login");
        return;
      }

      const { data: isAdmin, error: roleError } =
        await supabase.rpc("is_admin");

      if (!active) return;

      if (roleError || isAdmin !== true) {
        router.replace("/admin/login");
        return;
      }

      setAuthorized(true);
      
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError || !sessionData.session?.access_token) {
          throw new Error("Admin session expired");
        }

        const response = await fetch("/api/admin/orders", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || result.success !== true) {
          throw new Error(result.message || "Unable to load orders");
        }

        if (!active) return;
        setOrders(result.orders);
        setOrdersError("");
      } catch (error) {
        if (!active) return;
        setOrdersError(
          error instanceof Error ? error.message : "Unable to load orders"
        );
      } finally {
        if (active) setLoadingOrders(false);
      }

    }

    void checkAdmin().catch(() => {
      if (active) router.replace("/admin/login");
    });

    return () => {
      active = false;
    };
  }, [router]);

  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Checking admin access...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-blue-700">
          Order Management
        </h1>

        <p className="mt-3 text-slate-600">
          UNITSHOP Customer Orders
        </p>

        
<div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
  {loadingOrders ? (
    <p className="text-slate-500">Loading orders...</p>
  ) : ordersError ? (
    <p className="text-red-600">{ordersError}</p>
  ) : orders.length === 0 ? (
    <p className="text-slate-500">No orders found.</p>
  ) : (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-lg border border-slate-200 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-800">
              {order.customer_name}
            </p>
            <span className="text-sm text-blue-700">
              {order.order_status}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Phone: {order.customer_phone}
          </p>
          <p className="text-sm text-slate-600">
            City: {order.customer_city}
          </p>
          <p className="text-sm text-slate-600">
            Total: {Number(order.total_amount).toLocaleString()} Ks
          </p>
          <p className="text-sm text-slate-600">
            Payment: {order.payment_method} ({order.payment_status})
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )}
</div>

      </div>
    </main>
  );
}
