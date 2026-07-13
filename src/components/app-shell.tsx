"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Ancho del contenido según la ruta: ancho en el panel de administración (/admin) para
// que quepan las tablas, y estrecho (el de siempre) en la vista de reporte de los no-admins.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const esAdmin = pathname?.startsWith("/admin") ?? false;
  const ancho = esAdmin ? "max-w-[1600px]" : "max-w-3xl";

  return (
    <>
      {/* Cabecera navy con el logo blanco de EDIBS. */}
      <header className="bg-[var(--color-navy-deep)]">
        <div className={`mx-auto flex ${ancho} items-center justify-between px-5 py-4`}>
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

      <div className={`mx-auto flex min-h-[calc(100vh-64px)] ${ancho} flex-col px-5 py-10`}>
        <main className="flex-1">{children}</main>
        <footer className="mt-10 text-center text-xs text-[var(--color-texto-muted)]">
          Uso interno de EDIBS. Los reportes crean issues en GitHub y avisan en Slack.
        </footer>
      </div>
    </>
  );
}
