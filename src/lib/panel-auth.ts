import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { esMiembroDeOrg } from "@/lib/github";

export const COOKIE_SESION = "edibs-panel";
const DURACION_MS = 8 * 60 * 60 * 1000; // 8 horas

function callbackUrl(): string {
  return `${env.siteUrl()}/api/panel/auth/callback`;
}

// URL de autorización de GitHub (OAuth de la GitHub App).
export function urlAutorizacion(state: string): string {
  const params = new URLSearchParams({
    client_id: env.githubClientId(),
    redirect_uri: callbackUrl(),
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

// Intercambia el código por un token de usuario y devuelve el login de GitHub.
export async function loginDesdeCodigo(code: string): Promise<string | null> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.githubClientId(),
      client_secret: env.githubClientSecret(),
      code,
      redirect_uri: callbackUrl(),
    }),
  });
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) return null;

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${data.access_token}`, Accept: "application/vnd.github+json" },
  });
  if (!userRes.ok) return null;
  const user = (await userRes.json()) as { login?: string };
  return user.login ?? null;
}

// Solo entran miembros activos de la org.
export async function accesoPermitido(login: string): Promise<boolean> {
  return esMiembroDeOrg(login);
}

// --- Sesión: cookie firmada (HMAC), sin estado en servidor ---

function firmar(payload: string): string {
  return crypto.createHmac("sha256", env.panelSessionSecret()).update(payload).digest("base64url");
}

export function crearSesion(login: string): string {
  const payload = JSON.stringify({ login, exp: Date.now() + DURACION_MS });
  const b64 = Buffer.from(payload).toString("base64url");
  return `${b64}.${firmar(b64)}`;
}

export function verificarSesion(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const [b64, firma] = cookie.split(".");
  if (!b64 || !firma) return null;
  const esperada = firmar(b64);
  // Comparación en tiempo constante.
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) {
    return null;
  }
  try {
    const { login, exp } = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (typeof exp !== "number" || exp < Date.now()) return null;
    return typeof login === "string" ? login : null;
  } catch {
    return null;
  }
}

// Devuelve el login del admin logueado, o null. Úsalo en páginas/acciones del panel.
export async function sesionActual(): Promise<string | null> {
  const store = await cookies();
  return verificarSesion(store.get(COOKIE_SESION)?.value);
}
