import type { Metadata } from "next";
import { ProductDetails } from "@/components/product-details";

export const metadata: Metadata = { title: "Product details | UNITSHOP" };
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ id }, { lang }] = await Promise.all([params, searchParams]);
  return (
    <ProductDetails
      key={id}
      id={id}
      initialLocale={lang === "my" ? "my" : "en"}
    />
  );
}
