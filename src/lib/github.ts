import "server-only";

import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { env } from "@/lib/env";
import { aliasDeRepo, devsDeRepo, type Producto } from "@/lib/products";

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

// Lista los productos: repos de la org con el topic configurado (bug-portal).
// Añadir un producto = poner el topic al repo, cero cambios aquí.
export async function listarProductos(): Promise<Producto[]> {
  const octokit = octokitApp();
  const org = env.githubOrg();
  const topic = env.githubProductTopic();

  // La búsqueda por topic cubre repos privados accesibles por la instalación.
  const query = `org:${org} topic:${topic}`;
  const repos = await octokit.paginate(octokit.rest.search.repos, {
    q: query,
    per_page: 100,
  });

  return repos
    .map((r) => ({
      repo: r.name,
      nombre: aliasDeRepo(r.name),
      descripcion: r.description ?? null,
      devsSlack: devsDeRepo(r.name),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// Comprueba que un repo concreto es un producto válido (tiene el topic).
export async function esProductoValido(repo: string): Promise<Producto | null> {
  const productos = await listarProductos();
  return productos.find((p) => p.repo === repo) ?? null;
}

export type NuevoIssue = {
  repo: string;
  titulo: string;
  cuerpo: string;
};

export type IssueCreado = {
  numero: number;
  url: string;
};

// Crea el issue en el repo del producto vía la GitHub App.
export async function crearIssue({ repo, titulo, cuerpo }: NuevoIssue): Promise<IssueCreado> {
  const octokit = octokitApp();
  const { data } = await octokit.rest.issues.create({
    owner: env.githubOrg(),
    repo,
    title: titulo,
    body: cuerpo,
  });
  return { numero: data.number, url: data.html_url };
}
