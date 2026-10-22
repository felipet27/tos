import type { Metadata } from "next";
import "../globals.css";
import { geistMono, geistSans } from "../fonts";

// Root layout for "/", which only redirects to /es or /en
export const metadata: Metadata = {
  title: "TOS // TwoFFactor Sistema Operativo",
  robots: { index: false, follow: false },
};

export default function RedirectLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
