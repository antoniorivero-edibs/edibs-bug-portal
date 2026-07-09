import Link from "next/link";
import { notFound } from "next/navigation";
import { esProductoValido } from "@/lib/productos-db";
import IdentityGate from "@/components/identity-gate";
import FormularioReporte from "./form";
import type { TipoReporte } from "@/lib/report";

// Página de formulario para un tipo concreto (bug o sugerencia). La usan las subrutas.
export default async function PaginaTipo({
  repo,
  tipo,
}: {
  repo: string;
  tipo: TipoReporte;
}) {
  let producto = null;
  try {
    producto = await esProductoValido(repo);
  } catch {
    producto = null;
  }
  if (!producto) notFound();

  const esSug = tipo === "sugerencia";
  return (
    <div>
      <Link
        href={`/report/${producto.repo}`}
        className="text-sm text-[var(--color-texto-muted)] transition-colors hover:text-[var(--color-navy)]"
      >
        ← Cambiar tipo
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-[var(--color-navy)]">
        {esSug ? "💡 Sugerencia" : "🐞 Reportar bug"} · {producto.nombre}
      </h1>
      <p className="mb-6 mt-1 text-sm text-[var(--color-texto-muted)]">
        {esSug
          ? "Cuéntanos qué función o mejora propones."
          : "Cuenta qué pasa y adjunta capturas o vídeos si ayudan."}
      </p>
      <IdentityGate>
        <FormularioReporte repo={producto.repo} nombreProducto={producto.nombre} tipo={tipo} />
      </IdentityGate>
    </div>
  );
}
