import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
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
        {children}
        <Script id="qr-source-tracking" strategy="afterInteractive">
          {`
            (() => {
              const source = new URLSearchParams(window.location.search).get("src");
              if (source === "qr") {
                try {
                  if (typeof window.localStorage !== "undefined") {
                    localStorage.setItem("trafficSource", "qr");
                  }
                } catch (error) {
                  console.error("Failed to set trafficSource:", error);
                }
              }
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
