"use server";

import { revalidatePath } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { sesionActual } from "@/lib/panel-auth";
import { sincronizarDescripcionRepo } from "@/lib/github";

// Guarda TODOS los productos de una vez (un solo botón en el panel). Solo admins.
// Sincroniza con GitHub únicamente las descripciones que hayan cambiado.
export async function guardarProductos(formData: FormData): Promise<void> {
  const login = await sesionActual();
  if (!login) throw new Error("No autorizado.");

  const repos = String(formData.get("repos") ?? "")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  if (repos.length === 0) return;

  const admin = crearClienteAdmin();

  // Estado actual para detectar qué descripciones han cambiado.
  const { data: actuales } = await admin
    .from("productos")
    .select("repo, descripcion")
    .in("repo", repos);
  const descrActual = new Map((actuales ?? []).map((r) => [r.repo, r.descripcion ?? ""]));

  const ahora = new Date().toISOString();
  const filas = repos.map((repo) => ({
    repo,
    alias: String(formData.get(`alias:${repo}`) ?? "").trim() || null,
    descripcion: String(formData.get(`descripcion:${repo}`) ?? "").trim() || null,
    visible: formData.get(`visible:${repo}`) === "on",
    orden: Number.parseInt(String(formData.get(`orden:${repo}`) ?? "100"), 10) || 100,
    actualizado_en: ahora,
  }));

  await admin.from("productos").upsert(filas, { onConflict: "repo" });

  // Sincronizar a GitHub solo las descripciones nuevas/cambiadas y no vacías.
  for (const f of filas) {
    if (f.descripcion && f.descripcion !== (descrActual.get(f.repo) ?? "")) {
      try {
        await sincronizarDescripcionRepo(f.repo, f.descripcion);
      } catch (err) {
        console.error(`No se pudo sincronizar la descripción de ${f.repo}:`, err);
      }
    }
  }

  revalidatePath("/panel");
}
