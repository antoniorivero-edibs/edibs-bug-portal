import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
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
        {/* Cabecera navy con el logo blanco de EDIBS. */}
        <header className="bg-[var(--color-navy-deep)]">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/edibs-logo-white.png"
                alt="EDIBS"
                width={112}
                height={34}
                priority
                className="h-7 w-auto"
              />
              <span className="text-sm font-medium text-white/70">Portal de bugs</span>
            </Link>
          </div>
        </header>

        <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl flex-col px-5 py-10">
          <main className="flex-1">{children}</main>
          <footer className="mt-10 text-xs text-[var(--color-texto-muted)]">
            Uso interno de EDIBS. Los reportes crean issues en GitHub y avisan en Slack.
          </footer>
        </div>
      </body>
    </html>
  );
}
