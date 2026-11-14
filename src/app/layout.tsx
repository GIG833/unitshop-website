import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "UNITSHOP | Electronics for everyday connections",
  description:
    "Explore UNITSHOP electronics, including MiFi, routers, WiFi cards, CCTV and gadgets. Browse product details and prices in MMK. Online checkout is not yet available.",
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
