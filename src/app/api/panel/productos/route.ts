import { NextResponse, type NextRequest } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { sesionActual, accesoPermitido } from "@/lib/panel-auth";
import { sincronizarDescripcionRepo } from "@/lib/github";

type FilaEntrada = {
  repo: string;
  alias?: string | null;
  descripcion?: string | null;
  visible?: boolean;
  orden?: number;
};

// Guarda todos los productos de una vez (desde el panel). Solo admins de la org.
// Sincroniza a GitHub solo las descripciones que hayan cambiado.
export async function POST(request: NextRequest) {
  const login = await sesionActual();
  if (!login) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  // Revalidar la membresía de la org en la escritura (por si se revocó tras abrir sesión).
  if (!(await accesoPermitido(login))) {
    return NextResponse.json({ error: "Ya no eres miembro de la organización." }, { status: 403 });
  }

  let body: { productos?: FilaEntrada[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const entrada = Array.isArray(body.productos) ? body.productos : [];
  if (entrada.length === 0) return NextResponse.json({ ok: true });

  const admin = crearClienteAdmin();
  const ahora = new Date().toISOString();

  // Deduplicar por repo (last-wins) y descartar repos vacíos: un ON CONFLICT con el
  // mismo repo repetido en el mismo batch haría fallar todo el upsert.
  const porRepo = new Map<string, { repo: string; alias: string | null; descripcion: string | null; visible: boolean; orden: number; actualizado_en: string }>();
  for (const e of entrada) {
    const repo = String(e.repo ?? "").trim();
    if (!repo) continue;
    porRepo.set(repo, {
      repo,
      alias: (e.alias ?? "").trim() || null,
      descripcion: (e.descripcion ?? "").trim() || null,
      visible: Boolean(e.visible),
      orden: Number.isFinite(e.orden) ? Number(e.orden) : 100,
      actualizado_en: ahora,
    });
  }
  const filas = [...porRepo.values()];
  if (filas.length === 0) return NextResponse.json({ ok: true });

  const { data: actuales } = await admin
    .from("productos")
    .select("repo, descripcion")
    .in("repo", filas.map((f) => f.repo));
  const descrActual = new Map((actuales ?? []).map((r) => [r.repo, r.descripcion ?? ""]));

  const { error } = await admin.from("productos").upsert(filas, { onConflict: "repo" });
  if (error) return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });

  // Sincronizar a GitHub solo descripciones nuevas/cambiadas.
  for (const f of filas) {
    if (f.descripcion && f.descripcion !== (descrActual.get(f.repo) ?? "")) {
      try {
        await sincronizarDescripcionRepo(f.repo, f.descripcion);
      } catch (err) {
        console.error(`No se pudo sincronizar la descripción de ${f.repo}:`, err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
