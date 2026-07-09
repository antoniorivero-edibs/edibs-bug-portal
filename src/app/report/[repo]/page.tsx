import Link from "next/link";
import { notFound } from "next/navigation";
import { esProductoValido } from "@/lib/productos-db";
import IdentityGate from "@/components/identity-gate";
import FormularioReporte from "./form";

// Valida que el repo es un producto reportable antes de mostrar el formulario.
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
    // Si falla la GitHub App, tratamos el producto como no disponible.
    producto = null;
  }

  if (!producto) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-[var(--color-texto-muted)] transition-colors hover:text-[var(--color-navy)]"
      >
        ← Volver
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-[var(--color-navy)]">
        Reportar bug · {producto.nombre}
      </h1>
      <p className="mb-6 mt-1 text-sm text-[var(--color-texto-muted)]">
        Cuenta qué pasa y adjunta capturas o vídeos si ayudan.
      </p>
      <IdentityGate>
        <FormularioReporte repo={producto.repo} nombreProducto={producto.nombre} />
      </IdentityGate>
    </div>
  );
}
