import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "UNITSHOP | Electronics for everyday connections",
  description:
    "Explore the UNITSHOP customer website preview: MiFi, routers, WiFi cards, CCTV and gadgets. Sample products only; shopping is not yet available.",
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
