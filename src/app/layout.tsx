import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de bugs · EDIBS",
  description: "Reporta bugs de los productos de EDIBS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-10">
          <header className="mb-8">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Portal de bugs <span className="text-[var(--color-texto-suave)]">· EDIBS</span>
            </Link>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-10 text-xs text-[var(--color-texto-suave)]">
            Uso interno de EDIBS. Los reportes crean issues en GitHub y avisan en Slack.
          </footer>
        </div>
      </body>
    </html>
  );
}
