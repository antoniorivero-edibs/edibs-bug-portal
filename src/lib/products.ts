// Representa un producto reportable (un repo de la org con el topic bug-portal).
export type Producto = {
  repo: string; // nombre del repo (owner se asume la org)
  nombre: string; // alias legible que ve el usuario
  descripcion: string | null;
  // IDs de Slack de los devs a mencionar en el aviso de ese producto.
  devsSlack: string[];
  // Usuarios de GitHub a los que se asigna el issue del producto.
  asignados: string[];
};

// Un dev del equipo: su ID de Slack (para menciones) y su usuario de GitHub (para asignar).
type Dev = { slack: string; github: string };

const ANTONIO: Dev = { slack: process.env.SLACK_DEV_ANTONIO || "U0BAU7N7ZSA", github: "antoniorivero-edibs" };
const ANGEL: Dev = { slack: process.env.SLACK_DEV_ANGEL || "U0BC1RE5NUT", github: "adominguez-edibs" };

// Overrides opcionales de alias por repo. Por defecto el alias sale del nombre del repo.
// Añadir aquí solo cuando el nombre del repo no sea suficientemente claro.
const ALIAS_OVERRIDES: Record<string, string> = {
  "metrik-wiz-stars": "Metriks",
  "vertice-brandeador": "Vértice Brandeador",
};

// Devs por repo. Si un repo no está, se usa DEVS_POR_DEFECTO (todo el equipo).
const DEVS_POR_REPO: Record<string, Dev[]> = {
  // "metriks": [ANGEL],
};

const DEVS_POR_DEFECTO: Dev[] = [ANTONIO, ANGEL];

// Equipo completo (para resolver quién pulsa el botón de Slack "Me la quedo").
const EQUIPO: Dev[] = [ANTONIO, ANGEL];

// A partir del ID de Slack de quien pulsa, devuelve su usuario de GitHub (o null si no
// está en el equipo). Así solo Antonio y Ángel pueden autoasignarse una sugerencia.
export function githubDeSlack(slackId: string): string | null {
  return EQUIPO.find((d) => d.slack === slackId)?.github ?? null;
}

// Deriva un alias legible a partir del nombre del repo si no hay override.
// Ej: "edibs-crm-onboarding" -> "Edibs Crm Onboarding".
export function aliasDeRepo(repo: string): string {
  if (ALIAS_OVERRIDES[repo]) return ALIAS_OVERRIDES[repo];
  return repo
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function devsDeRepo(repo: string): Dev[] {
  return DEVS_POR_REPO[repo] ?? DEVS_POR_DEFECTO;
}

// Label que lleva todo issue creado desde el portal. El resto de labels
// (categoría, área, tipo...) las decide Claude y se crean si no existen.
export const LABEL_PORTAL = "portal";

// Vocabulario base de categorías sugerido a Claude. No es una lista cerrada:
// Claude puede añadir las que necesite. Sirve para dar consistencia.
export const CATEGORIAS_SUGERIDAS = [
  "frontend",
  "backend",
  "auth",
  "ui",
  "datos",
  "rendimiento",
  "integracion",
  "infra",
  "otro",
];

// IDs de Slack de los devs del producto (para mencionar en el aviso).
export function slacksDeRepo(repo: string): string[] {
  return devsDeRepo(repo).map((d) => d.slack);
}

// Usuarios de GitHub del producto (para asignar el issue).
export function asignadosDeRepo(repo: string): string[] {
  return devsDeRepo(repo).map((d) => d.github);
}
