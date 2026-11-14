import type { Metadata } from "next";
import { GuestCheckout } from "@/components/guest-checkout";
export const metadata: Metadata = {
  title: "Guest checkout preview | UNITSHOP",
};
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  return <GuestCheckout initialLocale={lang === "my" ? "my" : "en"} />;
}
