import Link from "next/link";
import { notFound } from "next/navigation";
import { esProductoValido } from "@/lib/github";
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
      <Link href="/" className="text-sm text-[var(--color-texto-suave)] hover:text-[var(--color-texto)]">
        ← Volver
      </Link>
      <h1 className="mt-3 text-xl font-semibold">Reportar bug · {producto.nombre}</h1>
      <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
        Cuenta qué pasa y adjunta capturas o vídeos si ayudan.
      </p>
      <FormularioReporte repo={producto.repo} nombreProducto={producto.nombre} />
    </div>
  );
}
