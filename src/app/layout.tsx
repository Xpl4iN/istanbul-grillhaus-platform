import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import RecoveryBootstrap from "@/components/RecoveryBootstrap";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Istanbul Grillhaus – Online Bestellen",
  description: "Döner, Pizza & mehr online bestellen bei Istanbul Grillhaus in Weilheim. 100% Halal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} antialiased`}>
        <RecoveryBootstrap />
        {children}
        <Analytics />
        <Script id="qr-source-tracking" strategy="afterInteractive">
          {`
            (() => {
              const source = new URLSearchParams(window.location.search).get("src");
              if (source === "qr") {
                try {
                  if (typeof window.localStorage !== "undefined") {
                    localStorage.setItem("trafficSource", "qr");
                  }
                  
                  // TEA QR Scan Tracker (Beacon API POST)
                  const teaUrl = "https://tea.xyourp.de/api/qr/track/69a2c008faf8b7b90f74516e";
                  if (navigator.sendBeacon) {
                    navigator.sendBeacon(teaUrl);
                  } else {
                    fetch(teaUrl, { method: "POST", keepalive: true }).catch(() => {});
                  }
                } catch (error) {
                  console.error("Failed to track QR scan source:", error);
                }
              }
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
