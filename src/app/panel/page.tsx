import Image from "next/image";
import { sesionActual } from "@/lib/panel-auth";
import { listarReposOrg } from "@/lib/github";
import { listarProductosDB, type ProductoDB } from "@/lib/productos-db";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { iaConfigurada } from "@/lib/ai";
import { guardarProductos } from "./actions";
import Tabs from "./tabs";

export const dynamic = "force-dynamic";

const ERRORES: Record<string, string> = {
  state: "La sesión de login caducó. Inténtalo de nuevo.",
  github: "No se pudo autenticar con GitHub.",
  no_org: "Tu cuenta de GitHub no es miembro de la organización EDIBS-SCHOOL.",
};

type Bug = {
  repo: string;
  issue_number: number;
  titulo: string;
  estado: string;
  reporter_email: string;
  issue_url: string;
  slack_permalink: string | null;
  ia_triaje: boolean;
  ia_investigacion: boolean;
  creado_en: string;
};

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const login = await sesionActual();

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

  // Datos
  let repos: { repo: string; descripcion: string | null }[] = [];
  let errorRepos = false;
  try {
    repos = await listarReposOrg();
  } catch {
    errorRepos = true;
  }
  const filas = await listarProductosDB();
  const porRepo = new Map(filas.map((f) => [f.repo, f]));

  // Activos (visibles) primero por orden; luego el resto por nombre.
  const conEstado = repos.map((r) => ({ ...r, db: porRepo.get(r.repo) }));
  const activos = conEstado
    .filter((r) => r.db?.visible)
    .sort((a, b) => (a.db!.orden - b.db!.orden) || a.repo.localeCompare(b.repo));
  const otros = conEstado
    .filter((r) => !r.db?.visible)
    .sort((a, b) => a.repo.localeCompare(b.repo));

  const admin = crearClienteAdmin();
  const { data: bugsData } = await admin
    .from("reportes")
    .select("repo, issue_number, titulo, estado, reporter_email, issue_url, slack_permalink, ia_triaje, ia_investigacion, creado_en")
    .order("creado_en", { ascending: false })
    .limit(200);
  const bugs = (bugsData ?? []) as Bug[];
  const iaOn = iaConfigurada();

  const todosRepos = [...activos, ...otros].map((r) => r.repo).join("\n");

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

      <Tabs
        etiquetas={["Productos", `Bugs (${bugs.length})`]}
        paneles={[
          <PanelProductos
            key="p"
            activos={activos}
            otros={otros}
            todosRepos={todosRepos}
            errorRepos={errorRepos}
          />,
          <PanelBugs key="b" bugs={bugs} iaOn={iaOn} />,
        ]}
      />
    </div>
  );
}

type Fila = { repo: string; descripcion: string | null; db?: ProductoDB };

function FilaProducto({ r }: { r: Fila }) {
  const p = r.db;
  return (
    <div className="grid grid-cols-1 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-borde)] bg-white p-3 sm:grid-cols-[auto_140px_1fr_70px]">
      <label className="flex items-center gap-2">
        <input type="checkbox" name={`visible:${r.repo}`} defaultChecked={p?.visible ?? false} />
        <span className="font-mono text-xs text-[var(--color-texto-muted)]">{r.repo}</span>
      </label>
      <input
        name={`alias:${r.repo}`}
        defaultValue={p?.alias ?? ""}
        placeholder="Alias"
        className="rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-2 py-1 text-sm outline-none focus:border-[var(--color-action)]"
      />
      <input
        name={`descripcion:${r.repo}`}
        defaultValue={p?.descripcion ?? r.descripcion ?? ""}
        placeholder="Descripción (se sincroniza con GitHub)"
        className="rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-2 py-1 text-sm outline-none focus:border-[var(--color-action)]"
      />
      <label className="flex items-center gap-1 text-xs text-[var(--color-texto-muted)]">
        Orden
        <input
          name={`orden:${r.repo}`}
          type="number"
          defaultValue={p?.orden ?? 100}
          className="w-14 rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-2 py-1 text-sm outline-none focus:border-[var(--color-action)]"
        />
      </label>
    </div>
  );
}

function PanelProductos({
  activos,
  otros,
  todosRepos,
  errorRepos,
}: {
  activos: Fila[];
  otros: Fila[];
  todosRepos: string;
  errorRepos: boolean;
}) {
  return (
    <form action={guardarProductos}>
      <input type="hidden" name="repos" value={todosRepos} />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--color-texto-muted)]">
          Marca <strong>visible</strong> para mostrar el producto en el portal. <strong>Orden</strong>:
          menor número = más arriba.
        </p>
        <button className="rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-action-hover)]">
          Guardar cambios
        </button>
      </div>

      {errorRepos && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          No se pudieron listar los repos de la org (revisa la GitHub App).
        </div>
      )}

      <h3 className="mb-2 text-sm font-semibold text-[var(--color-navy)]">
        Activos en el portal ({activos.length})
      </h3>
      <div className="space-y-2">
        {activos.length === 0 && (
          <p className="text-sm text-[var(--color-texto-muted)]">Ninguno visible todavía.</p>
        )}
        {activos.map((r) => (
          <FilaProducto key={r.repo} r={r} />
        ))}
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-[var(--color-texto-muted)]">
        Otros repos disponibles ({otros.length})
      </h3>
      <div className="space-y-2 opacity-90">
        {otros.map((r) => (
          <FilaProducto key={r.repo} r={r} />
        ))}
      </div>
    </form>
  );
}

function PanelBugs({ bugs, iaOn }: { bugs: Bug[]; iaOn: boolean }) {
  if (bugs.length === 0) {
    return <p className="text-sm text-[var(--color-texto-muted)]">Aún no hay bugs reportados.</p>;
  }
  return (
    <div className="space-y-3">
      {bugs.map((b) => (
        <div
          key={`${b.repo}#${b.issue_number}`}
          className="rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={
                    b.estado === "cerrado"
                      ? "rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
                      : "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                  }
                >
                  {b.estado}
                </span>
                <span className="font-mono text-xs text-[var(--color-texto-muted)]">{b.repo}</span>
              </div>
              <p className="mt-1 font-medium text-[var(--color-navy)]">{b.titulo}</p>
              <p className="mt-0.5 text-xs text-[var(--color-texto-muted)]">
                {b.reporter_email} · {b.creado_en.slice(0, 10)}
              </p>
            </div>
            <a
              href={b.issue_url}
              target="_blank"
              className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-borde)] px-3 py-1 text-xs font-medium text-[var(--color-action)] hover:border-[var(--color-action)]"
            >
              Issue #{b.issue_number} ↗
            </a>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {/* Slack */}
            {b.slack_permalink ? (
              <a
                href={b.slack_permalink}
                target="_blank"
                className="rounded-full bg-[var(--color-surface-strong)] px-2 py-0.5 font-medium text-[var(--color-navy)] hover:underline"
              >
                💬 Slack enviado ↗
              </a>
            ) : (
              <span className="rounded-full bg-[var(--color-surface-soft)] px-2 py-0.5 text-[var(--color-texto-muted)]">
                💬 Slack: no enviado
              </span>
            )}

            {/* IA */}
            <span className="rounded-full bg-[var(--color-surface-soft)] px-2 py-0.5 text-[var(--color-texto-muted)]">
              🔎 Triaje: {b.ia_triaje ? "✓" : iaOn ? "pendiente" : "off"}
            </span>
            <span className="rounded-full bg-[var(--color-surface-soft)] px-2 py-0.5 text-[var(--color-texto-muted)]">
              🧭 Investigación: {b.ia_investigacion ? "✓" : iaOn ? "pendiente" : "off"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
