import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Spread Scanner — Prediction Market Divergence",
  description:
    "Live cross-platform spread detection for Polymarket and Kalshi prediction markets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main style={{ paddingTop: 16, paddingBottom: 48 }}>{children}</main>
      </body>
    </html>
  );
}
