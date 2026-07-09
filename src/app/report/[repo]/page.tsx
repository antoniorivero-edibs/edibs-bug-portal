import Link from "next/link";
import { notFound } from "next/navigation";
import { esProductoValido } from "@/lib/productos-db";
import IdentityGate from "@/components/identity-gate";

// Pantalla de elección: elige entre reportar un bug o enviar una sugerencia.
// No se muestra ningún formulario hasta elegir el tipo (evita enviar en el que no es).
export default async function ReportPage({
  params,
}: {
  params: Promise<{ repo: string }>;
}) {
  const { repo } = await params;

  let producto = null;
  try {
    producto = await esProductoValido(repo);
  } catch {
    producto = null;
  }
  if (!producto) notFound();

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-[var(--color-texto-muted)] transition-colors hover:text-[var(--color-navy)]"
      >
        ← Volver
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-[var(--color-navy)]">{producto.nombre}</h1>
      <p className="mb-6 mt-1 text-sm text-[var(--color-texto-muted)]">
        ¿Qué quieres enviar?
      </p>

      <IdentityGate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={`/report/${producto.repo}/bug`}
            className="rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white p-5 transition-all hover:border-[var(--color-action)] hover:shadow-[var(--edibs-shadow)]"
          >
            <div className="text-2xl">🐞</div>
            <div className="mt-2 font-semibold text-[var(--color-navy)]">Reportar un bug</div>
            <div className="mt-1 text-sm text-[var(--color-texto-muted)]">
              Algo que no funciona como debería.
            </div>
          </Link>
          <Link
            href={`/report/${producto.repo}/sugerencia`}
            className="rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white p-5 transition-all hover:border-[var(--color-action)] hover:shadow-[var(--edibs-shadow)]"
          >
            <div className="text-2xl">💡</div>
            <div className="mt-2 font-semibold text-[var(--color-navy)]">Enviar una sugerencia</div>
            <div className="mt-1 text-sm text-[var(--color-texto-muted)]">
              Una función, un cambio o una mejora (no un error).
            </div>
          </Link>
        </div>
      </IdentityGate>
    </div>
  );
}
