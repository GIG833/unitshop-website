import type { Metadata } from "next";
import { MyOrders } from "@/components/my-orders";

export const metadata: Metadata = { title: "My Orders | UNITSHOP", robots: { index: false, follow: false } };

export default async function MyOrdersPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  return <MyOrders initialLocale={lang === "my" ? "my" : "en"} />;
}
