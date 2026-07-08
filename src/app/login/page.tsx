"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { crearClienteNavegador } from "@/lib/supabase/client";

const MENSAJES_ERROR: Record<string, string> = {
  dominio_no_permitido: "Tu cuenta no es de un dominio de EDIBS. Usa tu email corporativo.",
  enlace_invalido: "No se pudo completar el acceso. Inténtalo de nuevo.",
};

function LoginContent() {
  const params = useSearchParams();
  const [cargando, setCargando] = useState(false);
  const errorQuery = params.get("error");
  const [error, setError] = useState(errorQuery ? MENSAJES_ERROR[errorQuery] ?? "Error de acceso." : "");

  async function entrarConGoogle() {
    setError("");
    setCargando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Deja elegir cuenta en cada login (útil con varias cuentas de Google).
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setCargando(false);
      setError("No se pudo iniciar sesión con Google.");
    }
    // Si va bien, el navegador redirige a Google.
  }

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white p-8 shadow-[var(--edibs-shadow)]">
        <Image src="/edibs-logo.png" alt="EDIBS" width={140} height={44} className="h-9 w-auto" />
        <h1 className="mt-6 text-xl font-bold text-[var(--color-navy)]">Portal de bugs</h1>
        <p className="mt-1 text-sm text-[var(--color-texto-muted)]">
          Entra con tu cuenta de Google de EDIBS para reportar bugs.
        </p>

        <button
          onClick={entrarConGoogle}
          disabled={cargando}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-[var(--radius-pill)] border border-[var(--color-borde)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-texto)] transition-colors hover:bg-[var(--color-surface-soft)] disabled:opacity-60"
        >
          <GoogleIcon />
          {cargando ? "Redirigiendo..." : "Entrar con Google"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

// Logo de Google (SVG inline, colores oficiales).
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
