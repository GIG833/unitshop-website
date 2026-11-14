import { Storefront } from "@/components/storefront";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  return <Storefront initialLocale={lang === "my" ? "my" : "en"} />;
}
