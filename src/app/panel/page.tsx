import Image from "next/image";
import { sesionActual } from "@/lib/panel-auth";
import { listarReposOrg } from "@/lib/github";
import { listarProductosDB } from "@/lib/productos-db";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { guardarProducto } from "./actions";

export const dynamic = "force-dynamic";

const ERRORES: Record<string, string> = {
  state: "La sesión de login caducó. Inténtalo de nuevo.",
  github: "No se pudo autenticar con GitHub.",
  no_org: "Tu cuenta de GitHub no es miembro de la organización EDIBS-SCHOOL.",
};

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const login = await sesionActual();

  // --- Sin sesión: pantalla de acceso ---
  if (!login) {
    return (
      <div className="mx-auto mt-8 max-w-sm">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white p-8 shadow-[var(--edibs-shadow)]">
          <div className="inline-flex rounded-[var(--radius-sm)] bg-[var(--color-navy-deep)] px-4 py-3">
            <Image src="/edibs-logo-white.png" alt="EDIBS" width={120} height={34} className="h-8 w-auto" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-[var(--color-navy)]">Panel de bugs</h1>
          <p className="mt-1 text-sm text-[var(--color-texto-muted)]">
            Acceso solo para miembros de la organización EDIBS en GitHub.
          </p>
          <a
            href="/api/panel/auth/login"
            className="mt-6 inline-block rounded-[var(--radius-pill)] bg-[var(--color-navy)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-navy-deep)]"
          >
            Entrar con GitHub
          </a>
          {error && <p className="mt-4 text-sm text-red-600">{ERRORES[error] ?? "Error de acceso."}</p>}
        </div>
      </div>
    );
  }

  // --- Con sesión: cargar datos ---
  let repos: { repo: string; descripcion: string | null }[] = [];
  let errorRepos = false;
  try {
    repos = await listarReposOrg();
  } catch {
    errorRepos = true;
  }
  const filas = await listarProductosDB();
  const porRepo = new Map(filas.map((f) => [f.repo, f]));

  const admin = crearClienteAdmin();
  const { data: bugs } = await admin
    .from("reportes")
    .select("repo, issue_number, titulo, estado, reporter_email, issue_url, creado_en")
    .order("creado_en", { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">Panel de bugs</h1>
          <p className="mt-1 text-sm text-[var(--color-texto-muted)]">Conectado como {login}</p>
        </div>
        <form action="/api/panel/auth/logout" method="post">
          <button className="rounded-[var(--radius-pill)] border border-[var(--color-borde)] px-4 py-1.5 text-xs font-medium text-[var(--color-texto-muted)] hover:border-[var(--color-action)] hover:text-[var(--color-navy)]">
            Salir
          </button>
        </form>
      </div>

      {/* --- Productos --- */}
      <h2 className="mb-2 text-lg font-semibold text-[var(--color-navy)]">Productos</h2>
      <p className="mb-4 text-sm text-[var(--color-texto-muted)]">
        Marca <strong>visible</strong> para que aparezca en el portal. El alias es el nombre que ve la
        gente; la descripción se sincroniza con GitHub.
      </p>

      {errorRepos && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          No se pudieron listar los repos de la org (revisa la GitHub App).
        </div>
      )}

      <div className="space-y-3">
        {repos.map((r) => {
          const p = porRepo.get(r.repo);
          return (
            <form
              key={r.repo}
              action={guardarProducto}
              className="grid grid-cols-1 gap-2 rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white p-4 sm:grid-cols-[auto_1fr_1fr_auto_auto] sm:items-center"
            >
              <input type="hidden" name="repo" value={r.repo} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="visible" defaultChecked={p?.visible ?? false} />
                <span className="font-mono text-xs text-[var(--color-texto-muted)]">{r.repo}</span>
              </label>
              <input
                name="alias"
                defaultValue={p?.alias ?? ""}
                placeholder="Alias (nombre visible)"
                className="rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-2 py-1 text-sm outline-none focus:border-[var(--color-action)]"
              />
              <input
                name="descripcion"
                defaultValue={p?.descripcion ?? r.descripcion ?? ""}
                placeholder="Descripción"
                className="rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-2 py-1 text-sm outline-none focus:border-[var(--color-action)]"
              />
              <input
                name="orden"
                type="number"
                defaultValue={p?.orden ?? 100}
                className="w-16 rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-2 py-1 text-sm outline-none focus:border-[var(--color-action)]"
              />
              <button className="rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-action-hover)]">
                Guardar
              </button>
            </form>
          );
        })}
      </div>

      {/* --- Bugs --- */}
      <h2 className="mb-2 mt-10 text-lg font-semibold text-[var(--color-navy)]">Bugs reportados</h2>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-borde)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-soft)] text-[var(--color-texto-muted)]">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Reporta</th>
              <th className="px-3 py-2">Issue</th>
            </tr>
          </thead>
          <tbody>
            {(bugs ?? []).map((b) => (
              <tr key={`${b.repo}#${b.issue_number}`} className="border-t border-[var(--color-borde)]">
                <td className="px-3 py-2 font-mono text-xs">{b.repo}</td>
                <td className="px-3 py-2">{b.titulo}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      b.estado === "cerrado"
                        ? "rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700"
                        : "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    }
                  >
                    {b.estado}
                  </span>
                </td>
                <td className="px-3 py-2 text-[var(--color-texto-muted)]">{b.reporter_email}</td>
                <td className="px-3 py-2">
                  <a href={b.issue_url} target="_blank" className="text-[var(--color-action)] underline">
                    #{b.issue_number}
                  </a>
                </td>
              </tr>
            ))}
            {(bugs ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-[var(--color-texto-muted)]">
                  Aún no hay bugs reportados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
