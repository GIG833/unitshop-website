import type { Metadata } from "next";
import { ShoppingCart } from "@/components/shopping-cart";
export const metadata: Metadata = { title: "Shopping cart | UNITSHOP" };
export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  return <ShoppingCart initialLocale={lang === "my" ? "my" : "en"} />;
}
