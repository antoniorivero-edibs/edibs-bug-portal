import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { listarProductos } from "@/lib/github";
import type { Producto } from "@/lib/products";
import LogoutButton from "@/components/logout-button";

// La lista de productos depende de la GitHub App; si aún no está configurada,
// mostramos un aviso en vez de romper la página.
async function cargarProductos(): Promise<{ productos: Producto[]; error: string | null }> {
  try {
    const productos = await listarProductos();
    return { productos, error: null };
  } catch {
    return {
      productos: [],
      error: "No se pudieron cargar los productos. Falta configurar la GitHub App o su instalación.",
    };
  }
}

export default async function HomePage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { productos, error } = await cargarProductos();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">Elige un producto</h1>
          <p className="mt-1 text-sm text-[var(--color-texto-muted)]">{user?.email}</p>
        </div>
        <LogoutButton />
      </div>

      {error && (
        <div className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {!error && productos.length === 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-texto-muted)]">
          No hay productos con el topic <code className="font-semibold">bug-portal</code> todavía. Pon
          el topic a un repo para que aparezca aquí.
        </div>
      )}

      <ul className="grid gap-3">
        {productos.map((p) => (
          <li key={p.repo}>
            <Link
              href={`/report/${p.repo}`}
              className="block rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white p-5 transition-all hover:border-[var(--color-action)] hover:shadow-[var(--edibs-shadow)]"
            >
              <div className="font-semibold text-[var(--color-navy)]">{p.nombre}</div>
              {p.descripcion && (
                <div className="mt-1 text-sm text-[var(--color-texto-muted)]">{p.descripcion}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
