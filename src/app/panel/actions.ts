"use server";

import { revalidatePath } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { sesionActual } from "@/lib/panel-auth";
import { sincronizarDescripcionRepo } from "@/lib/github";

// Guarda (crea o actualiza) un producto desde el panel. Solo admins logueados.
// Si hay descripción, la sincroniza también con GitHub.
export async function guardarProducto(formData: FormData): Promise<void> {
  const login = await sesionActual();
  if (!login) throw new Error("No autorizado.");

  const repo = String(formData.get("repo") ?? "").trim();
  if (!repo) throw new Error("Falta el repo.");
  const alias = String(formData.get("alias") ?? "").trim() || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const visible = formData.get("visible") === "on";
  const orden = Number.parseInt(String(formData.get("orden") ?? "100"), 10) || 100;

  const admin = crearClienteAdmin();
  await admin
    .from("productos")
    .upsert(
      { repo, alias, descripcion, visible, orden, actualizado_en: new Date().toISOString() },
      { onConflict: "repo" }
    );

  // Sincronizar la descripción con GitHub (best-effort; requiere Administration: write).
  if (descripcion) {
    try {
      await sincronizarDescripcionRepo(repo, descripcion);
    } catch (err) {
      console.error("No se pudo sincronizar la descripción con GitHub:", err);
    }
  }

  revalidatePath("/panel");
}
