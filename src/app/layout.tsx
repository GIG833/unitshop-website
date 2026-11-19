import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "UNITSHOP | Electronics for everyday connections",
  description:
    "Shop UNITSHOP MiFi, routers, WiFi cards, CCTV, power banks and gadgets. Explore prices in MMK, order with guest checkout, and choose COD or MMQR payment.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
