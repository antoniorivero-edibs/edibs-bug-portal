import "server-only";

import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { env } from "@/lib/env";

// Cliente Octokit autenticado como instalación de la GitHub App.
// Con esto se listan repos y se crean issues sin usar tokens personales.
function octokitApp(): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.githubAppId(),
      privateKey: env.githubPrivateKey(),
      installationId: env.githubInstallationId(),
    },
  });
}

// Repo de la org accesible por la instalación (para el panel: elegir qué mostrar).
export type RepoOrg = { repo: string; descripcion: string | null };

// Lista todos los repos de la org accesibles por la GitHub App.
export async function listarReposOrg(): Promise<RepoOrg[]> {
  const octokit = octokitApp();
  const repos = await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, {
    per_page: 100,
  });
  return repos
    .map((r) => ({ repo: r.name, descripcion: r.description ?? null }))
    .sort((a, b) => a.repo.localeCompare(b.repo));
}

// ¿El usuario de GitHub es miembro activo de la org? (para el acceso al panel).
// Requiere permiso "Organization members: read" en la GitHub App.
export async function esMiembroDeOrg(login: string): Promise<boolean> {
  const octokit = octokitApp();
  try {
    const { data } = await octokit.rest.orgs.getMembershipForUser({
      org: env.githubOrg(),
      username: login,
    });
    return data.state === "active";
  } catch {
    return false;
  }
}

// Sincroniza la descripción del repo en GitHub (requiere "Administration: write" en la App).
export async function sincronizarDescripcionRepo(repo: string, descripcion: string): Promise<void> {
  const octokit = octokitApp();
  await octokit.rest.repos.update({ owner: env.githubOrg(), repo, description: descripcion });
}

export type NuevoIssue = {
  repo: string;
  titulo: string;
  cuerpo: string;
  asignados?: string[];
};

export type IssueCreado = {
  numero: number;
  url: string;
};

// Crea el issue en el repo del producto vía la GitHub App.
export async function crearIssue({ repo, titulo, cuerpo, asignados }: NuevoIssue): Promise<IssueCreado> {
  const octokit = octokitApp();
  const { data } = await octokit.rest.issues.create({
    owner: env.githubOrg(),
    repo,
    title: titulo,
    body: cuerpo,
    // Si algún usuario no tiene acceso al repo, GitHub lo ignora sin fallar.
    assignees: asignados,
  });
  return { numero: data.number, url: data.html_url };
}

// Añade un comentario a un issue existente (usado por el análisis con IA).
// Devuelve la URL del comentario para poder enlazarlo desde el panel.
export async function comentarIssue(repo: string, numero: number, cuerpo: string): Promise<string> {
  const octokit = octokitApp();
  const { data } = await octokit.rest.issues.createComment({
    owner: env.githubOrg(),
    repo,
    issue_number: numero,
    body: cuerpo,
  });
  return data.html_url;
}

// Asigna un usuario de GitHub a un issue (usado por el botón "Me la quedo" de Slack).
export async function asignarIssue(repo: string, numero: number, usuario: string): Promise<void> {
  const octokit = octokitApp();
  await octokit.rest.issues.addAssignees({
    owner: env.githubOrg(),
    repo,
    issue_number: numero,
    assignees: [usuario],
  });
}

// Aplica labels a un issue, creando las que no existan en el repo (color neutro).
export async function aplicarLabels(repo: string, numero: number, labels: string[]): Promise<void> {
  const limpias = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
  if (limpias.length === 0) return;

  const octokit = octokitApp();
  const owner = env.githubOrg();

  const existentes = await octokit.paginate(octokit.rest.issues.listLabelsForRepo, {
    owner,
    repo,
    per_page: 100,
  });
  const nombres = new Set(existentes.map((l) => l.name.toLowerCase()));

  for (const label of limpias) {
    if (!nombres.has(label.toLowerCase())) {
      try {
        await octokit.rest.issues.createLabel({ owner, repo, name: label, color: "ededed" });
      } catch {
        // Si otra petición la creó a la vez, se ignora.
      }
    }
  }

  await octokit.rest.issues.addLabels({ owner, repo, issue_number: numero, labels: limpias });
}

// Extensiones y rutas que NO aportan al análisis (se filtran del árbol).
const EXCLUIR_RUTA = /(^|\/)(node_modules|\.next|dist|build|out|\.git|coverage|vendor|public\/)/;
const EXT_CODIGO =
  /\.(tsx?|jsx?|mjs|cjs|vue|svelte|py|rb|go|rs|java|kt|php|cs|swift|css|scss|sql|json|ya?ml|toml|md|prisma|graphql)$/i;

// Lista de rutas de ficheros de código del repo (filtradas), para la fase 1 de la IA.
export async function leerArbolRepo(repo: string): Promise<string[]> {
  const octokit = octokitApp();
  const owner = env.githubOrg();
  const { data: info } = await octokit.rest.repos.get({ owner, repo });
  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: info.default_branch,
    recursive: "1",
  });
  return data.tree
    .filter((t) => t.type === "blob" && typeof t.path === "string")
    .map((t) => t.path as string)
    .filter((p) => !EXCLUIR_RUTA.test(p) && EXT_CODIGO.test(p));
}

// Contenido (truncado) de un fichero del repo, para la fase 2 de la IA.
export async function leerFichero(
  repo: string,
  path: string,
  maxChars = 6000
): Promise<string | null> {
  const octokit = octokitApp();
  try {
    const { data } = await octokit.rest.repos.getContent({ owner: env.githubOrg(), repo, path });
    if (!Array.isArray(data) && data.type === "file" && "content" in data && data.content) {
      return Buffer.from(data.content, "base64").toString("utf8").slice(0, maxChars);
    }
  } catch {
    // Fichero no encontrado o sin acceso: se ignora.
  }
  return null;
}
