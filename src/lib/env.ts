// Acceso centralizado a variables de entorno.
// Lanza si falta una variable obligatoria en servidor, para fallar pronto y claro.

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
  }
  return valor;
}

function opcional(nombre: string, porDefecto = ""): string {
  return process.env[nombre] ?? porDefecto;
}

// Públicas (disponibles en cliente): deben empezar por NEXT_PUBLIC_.
export const env = {
  supabaseUrl: () => requerida("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => requerida("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  siteUrl: () => opcional("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

  // Solo servidor.
  supabaseServiceRoleKey: () => requerida("SUPABASE_SERVICE_ROLE_KEY"),

  githubAppId: () => requerida("GITHUB_APP_ID"),
  githubInstallationId: () => requerida("GITHUB_APP_INSTALLATION_ID"),
  githubPrivateKey: () => normalizarPem(requerida("GITHUB_APP_PRIVATE_KEY")),
  githubOrg: () => opcional("GITHUB_ORG", "EDIBS-SCHOOL"),
  githubProductTopic: () => opcional("GITHUB_PRODUCT_TOPIC", "bug-portal"),
  githubWebhookSecret: () => requerida("GITHUB_WEBHOOK_SECRET"),

  slackBotToken: () => requerida("SLACK_BOT_TOKEN"),
  slackBugChannel: () => opcional("SLACK_BUG_CHANNEL", "#bug"),
} as const;

// La clave privada de la GitHub App a veces llega con "\n" escapados (Vercel).
// La dejamos con saltos de línea reales para que la firmen bien.
function normalizarPem(clave: string): string {
  return clave.includes("\\n") ? clave.replace(/\\n/g, "\n") : clave;
}
