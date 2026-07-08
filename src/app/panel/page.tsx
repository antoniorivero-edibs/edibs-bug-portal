import Image from "next/image";
import { sesionActual } from "@/lib/panel-auth";
import { listarReposOrg } from "@/lib/github";
import { listarProductosDB } from "@/lib/productos-db";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { iaConfigurada } from "@/lib/ai";
import Tabs from "./tabs";
import ProductosCliente, { type ProductoInicial } from "./productos-cliente";

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
  const { data: bugsData } = await admin
    .from("reportes")
    .select(
      "repo, issue_number, titulo, estado, reporter_email, issue_url, slack_permalink, ia_triaje, ia_investigacion, creado_en"
    )
    .order("creado_en", { ascending: false })
    .limit(200);
  const bugs = (bugsData ?? []) as Bug[];
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
        etiquetas={["Productos", `Bugs (${bugs.length})`]}
        paneles={[
          <ProductosCliente key="p" inicial={inicial} />,
          <TablaBugs key="b" bugs={bugs} iaOn={iaOn} />,
        ]}
      />
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cerrado = estado === "cerrado";
  return (
    <span
      className={
        cerrado
          ? "rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
          : "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
      }
    >
      {estado}
    </span>
  );
}

function TablaBugs({ bugs, iaOn }: { bugs: Bug[]; iaOn: boolean }) {
  const th = "px-3 py-2 text-left text-xs font-semibold text-[var(--color-texto-muted)]";
  const td = "px-3 py-2 align-middle";
  const iaTxt = (ok: boolean) => (ok ? "✓" : iaOn ? "pendiente" : "off");

  if (bugs.length === 0) {
    return <p className="text-sm text-[var(--color-texto-muted)]">Aún no hay bugs reportados.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-borde)]">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--color-surface-soft)]">
          <tr>
            <th className={th}>Estado</th>
            <th className={th}>Producto</th>
            <th className={th}>Título</th>
            <th className={th}>Reporta</th>
            <th className={th}>Fecha</th>
            <th className={th}>Slack</th>
            <th className={th}>IA</th>
            <th className={th}>Issue</th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((b) => (
            <tr key={`${b.repo}#${b.issue_number}`} className="border-t border-[var(--color-borde)] bg-white">
              <td className={td}>
                <EstadoBadge estado={b.estado} />
              </td>
              <td className={`${td} font-mono text-xs`}>{b.repo}</td>
              <td className={`${td} max-w-xs`}>
                <span className="line-clamp-2">{b.titulo}</span>
              </td>
              <td className={`${td} text-xs text-[var(--color-texto-muted)]`}>{b.reporter_email}</td>
              <td className={`${td} whitespace-nowrap text-xs text-[var(--color-texto-muted)]`}>
                {b.creado_en.slice(0, 10)}
              </td>
              <td className={`${td} whitespace-nowrap text-xs`}>
                {b.slack_permalink ? (
                  <a href={b.slack_permalink} target="_blank" className="text-[var(--color-action)] hover:underline">
                    enviado ↗
                  </a>
                ) : (
                  <span className="text-[var(--color-texto-muted)]">—</span>
                )}
              </td>
              <td className={`${td} whitespace-nowrap text-xs text-[var(--color-texto-muted)]`}>
                triaje {iaTxt(b.ia_triaje)} · inv. {iaTxt(b.ia_investigacion)}
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <a href={b.issue_url} target="_blank" className="text-[var(--color-action)] hover:underline">
                  #{b.issue_number} ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
