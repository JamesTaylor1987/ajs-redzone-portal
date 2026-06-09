import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getLocale } from "@/lib/i18n";

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
  const locale = getLocale(cookies().get("ajs_locale")?.value);
  const htmlLang = locale === "de" ? "de" : locale === "fr" ? "fr" : "en-GB";

  return (
    <html lang={htmlLang}>
      <body className="min-h-screen font-sans antialiased">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
