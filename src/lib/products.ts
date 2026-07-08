// Representa un producto reportable (un repo de la org con el topic bug-portal).
export type Producto = {
  repo: string; // nombre del repo (owner se asume la org)
  nombre: string; // alias legible que ve el usuario
  descripcion: string | null;
  // IDs de Slack de los devs a mencionar en el aviso de ese producto.
  devsSlack: string[];
};

// Overrides opcionales de alias por repo. Por defecto el alias sale del nombre del repo.
// Añadir aquí solo cuando el nombre del repo no sea suficientemente claro.
const ALIAS_OVERRIDES: Record<string, string> = {
  // "metriks": "Metriks",
};

// Mapa de devs por repo (IDs de Slack). Si un repo no está, se usa DEVS_POR_DEFECTO.
// Los IDs vienen de docs/plan.md: Antonio y Ángel.
const DEV_ANTONIO = process.env.SLACK_DEV_ANTONIO || "U0BAU7N7ZSA";
const DEV_ANGEL = process.env.SLACK_DEV_ANGEL || "U0BC1RE5NUT";

const DEVS_POR_REPO: Record<string, string[]> = {
  // "metriks": [DEV_ANGEL],
};

const DEVS_POR_DEFECTO: string[] = [DEV_ANTONIO, DEV_ANGEL];

// Deriva un alias legible a partir del nombre del repo si no hay override.
// Ej: "edibs-crm-onboarding" -> "Edibs Crm Onboarding".
export function aliasDeRepo(repo: string): string {
  if (ALIAS_OVERRIDES[repo]) return ALIAS_OVERRIDES[repo];
  return repo
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function devsDeRepo(repo: string): string[] {
  return DEVS_POR_REPO[repo] ?? DEVS_POR_DEFECTO;
}
