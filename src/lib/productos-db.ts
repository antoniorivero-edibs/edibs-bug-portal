import "server-only";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { aliasDeRepo, slacksDeRepo, asignadosDeRepo, type Producto } from "@/lib/products";

// Fila de la tabla productos.
export type ProductoDB = {
  repo: string;
  alias: string | null;
  descripcion: string | null;
  visible: boolean;
  orden: number;
};

// Convierte una fila de DB en el Producto que usa el portal (mezcla devs/asignados del código).
function aProducto(p: ProductoDB): Producto {
  return {
    repo: p.repo,
    nombre: p.alias || aliasDeRepo(p.repo),
    descripcion: p.descripcion,
    devsSlack: slacksDeRepo(p.repo),
    asignados: asignadosDeRepo(p.repo),
  };
}

// Productos visibles del portal (curados en la DB, sin lag ni topic).
export async function listarProductos(): Promise<Producto[]> {
  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from("productos")
    .select("repo, alias, descripcion, visible, orden")
    .eq("visible", true)
    .order("orden")
    .order("alias");
  if (error) throw error;
  return (data ?? []).map(aProducto);
}

// Valida que un repo es un producto visible (reportable).
export async function esProductoValido(repo: string): Promise<Producto | null> {
  const admin = crearClienteAdmin();
  const { data } = await admin
    .from("productos")
    .select("repo, alias, descripcion, visible, orden")
    .eq("repo", repo)
    .eq("visible", true)
    .maybeSingle();
  return data ? aProducto(data) : null;
}

// Todas las filas (para el panel: visibles y ocultas).
export async function listarProductosDB(): Promise<ProductoDB[]> {
  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from("productos")
    .select("repo, alias, descripcion, visible, orden")
    .order("orden")
    .order("repo");
  if (error) throw error;
  return data ?? [];
}
