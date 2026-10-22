import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { geistMono, geistSans } from "../fonts";
import { LOCALES, hasLocale } from "@/i18n/config";
import { getTranslator } from "@/i18n/translate";
import { I18nProvider } from "@/i18n/I18nProvider";

export const dynamicParams = false;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b0c10",
};

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getTranslator(lang);
  return {
    title: t("TOS // TwoFFactor Sistema Operativo"),
    description: t("Sistema operativo interno de TwoFFactor: clientes, contratos, ingeniería y planos."),
    // Internal tool: keep it out of search engines
    robots: { index: false, follow: false },
    icons: {
      icon: [
        { url: "/favicons/favicon-forja.svg", type: "image/svg+xml" },
      ],
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
