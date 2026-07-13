import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import AppShell from "@/components/app-shell";
import "./globals.css";

// Manrope es la tipografía operativa de la marca EDIBS.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portal de bugs · EDIBS",
  description: "Reporta bugs de los productos de EDIBS.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={manrope.className}>
      <body className="min-h-screen bg-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
