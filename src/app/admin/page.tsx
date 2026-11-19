
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function AdminDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

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
    }

    checkAdmin().catch(() => {
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
          UNITSHOP Admin Dashboard
        </h1>

        <p className="mt-3 text-slate-600">
          Manage your store from one place.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Product Management</h2>
            <p className="mt-2 text-slate-600">Add and edit products, photos, pricing and availability.</p>
            <Link href="/admin/products" className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">
              Manage Products
            </Link>
          </section>
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Order Management</h2>
            <p className="mt-2 text-slate-600">Review customer delivery details, MMQR evidence and order status.</p>
            <Link href="/admin/orders" className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">
              View Orders
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
