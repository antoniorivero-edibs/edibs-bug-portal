import { env } from "@/lib/env";

// Comprueba que un email pertenece a un dominio permitido de EDIBS.
// El chequeo real de identidad lo hace Supabase (magic link); esto es la lista blanca de dominios.
export function emailPermitido(email: string | null | undefined): boolean {
  if (!email) return false;
  const dominio = email.split("@")[1]?.toLowerCase();
  if (!dominio) return false;
  return env.allowedEmailDomains().includes(dominio);
}
