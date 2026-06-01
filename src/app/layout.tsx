import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AJS Redzone Hardware Portal",
  description:
    "Order Redzone control panels, sensors and accessories from AJS Control & Automation.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
