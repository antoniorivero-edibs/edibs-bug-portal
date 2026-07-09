import Image from "next/image";
import { sesionActual } from "@/lib/panel-auth";
import { listarReposOrg } from "@/lib/github";
import { listarProductosDB } from "@/lib/productos-db";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { iaConfigurada } from "@/lib/ai";
import Tabs from "./tabs";
import ProductosCliente, { type ProductoInicial } from "./productos-cliente";
import BugsCliente, { type BugPanel } from "./bugs-cliente";

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
  let filas: Awaited<ReturnType<typeof listarProductosDB>> = [];
  try {
    filas = await listarProductosDB();
  } catch {
    errorRepos = true;
  }
  const porRepo = new Map(filas.map((f) => [f.repo, f]));

  const inicial: ProductoInicial[] = repos.map((r) => {
    const db = porRepo.get(r.repo);
    return {
      repo: r.repo,
      alias: db?.alias ?? "",
      descripcion: db?.descripcion ?? "",
      visible: db?.visible ?? false,
      orden: db?.orden ?? 100,
      ghDescripcion: r.descripcion ?? "",
    };
  });

  const admin = crearClienteAdmin();
  const { data: reportesData, error: errorBugs } = await admin
    .from("reportes")
    .select(
      "repo, issue_number, tipo, titulo, estado, reporter_email, reporter_nombre, reporter_slack_id, asignado_github, issue_url, descripcion, adjuntos, navegador, url_origen, slack_permalink, ia_triaje, ia_investigacion, ia_triaje_url, ia_investigacion_url, creado_en"
    )
    .order("creado_en", { ascending: false })
    .limit(300);
  if (errorBugs) console.error("Error cargando reportes en el panel:", errorBugs);
  const todos = (reportesData ?? []) as unknown as BugPanel[];
  const bugs = todos.filter((r) => (r.tipo ?? "bug") !== "sugerencia");
  const sugerencias = todos.filter((r) => r.tipo === "sugerencia");
  const iaOn = iaConfigurada();

  return (
    // El panel rompe el ancho del layout (3xl) para dar sitio a las tablas.
    <div className="mx-[calc(50%-50vw)] w-screen px-5">
      <div className="mx-auto max-w-5xl">
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

      {errorRepos && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          No se pudieron listar los repos de la org (revisa la GitHub App).
        </div>
      )}

      <Tabs
        etiquetas={["Productos", `Bugs (${bugs.length})`, `Sugerencias (${sugerencias.length})`]}
        paneles={[
          <ProductosCliente key="p" inicial={inicial} />,
          <BugsCliente key="b" bugs={bugs} iaOn={iaOn} />,
          <BugsCliente key="s" bugs={sugerencias} iaOn={iaOn} modo="sugerencia" />,
        ]}
      />
      </div>
    </div>
  );
}
