"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { leerReporter, guardarReporter, borrarReporter, type Reporter } from "@/lib/reporter";

// Contexto para que los hijos (formulario) accedan a la identidad ya validada.
const ReporterContext = createContext<Reporter | null>(null);
export function useReporter(): Reporter {
  const r = useContext(ReporterContext);
  if (!r) throw new Error("useReporter debe usarse dentro de IdentityGate");
  return r;
}

// Puerta de identidad. Sin login: pide nombre + correo (validado por dominio) una vez,
// lo guarda en el navegador y deja pasar. No se envía nada al correo.
export default function IdentityGate({ children }: { children: React.ReactNode }) {
  const [reporter, setReporter] = useState<Reporter | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setReporter(leerReporter());
    setListo(true);
  }, []);

  if (!listo) return null;

  if (!reporter) {
    return <FormularioIdentidad onListo={setReporter} />;
  }

  return (
    <ReporterContext.Provider value={reporter}>
      <div className="mb-6 flex items-center justify-between rounded-[var(--radius-pill)] border border-[var(--color-borde)] bg-[var(--color-surface-soft)] px-4 py-2 text-sm">
        <span className="text-[var(--color-texto-muted)]">
          Reportas como <span className="font-medium text-[var(--color-navy)]">{reporter.nombre}</span>{" "}
          ({reporter.email})
        </span>
        <button
          onClick={() => {
            borrarReporter();
            setReporter(null);
          }}
          className="ml-3 shrink-0 font-medium text-[var(--color-action)] hover:underline"
        >
          cambiar
        </button>
      </div>
      {children}
    </ReporterContext.Provider>
  );
}

function FormularioIdentidad({ onListo }: { onListo: (r: Reporter) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      // El servidor valida el dominio (no se revela cuáles valen) y resuelve el nombre solo.
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo continuar.");
        return;
      }
      const reporter = { nombre: data.nombre as string, email: data.email as string };
      guardarReporter(reporter);
      onListo(reporter);
    } catch {
      setError("No se pudo continuar. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const input =
    "w-full rounded-[var(--radius-sm)] border border-[var(--color-borde)] bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-action)]";

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white p-8 shadow-[var(--edibs-shadow)]">
        <h1 className="text-xl font-bold text-[var(--color-navy)]">Identifícate</h1>
        <p className="mt-1 text-sm text-[var(--color-texto-muted)]">
          Solo tu correo corporativo, para saber quién reporta. No se envía ningún correo.
        </p>
        <form onSubmit={enviar} className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu correo corporativo"
            aria-label="Correo corporativo"
            autoFocus
            className={input}
          />
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-action-hover)] disabled:opacity-60"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </div>
  );
}
