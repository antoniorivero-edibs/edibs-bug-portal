import "server-only";

// Lógica de dominios permitidos. SOLO servidor: los dominios no se exponen al navegador
// (nada de NEXT_PUBLIC), para no revelar qué correos valen. El cliente valida contra /api/identify.

const POR_DEFECTO = "edibschool.com,nuclio.school,indexmediamarketing.com";

function dominiosPermitidos(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS || POR_DEFECTO)
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

// Valida formato básico de email y que su dominio esté en la lista permitida.
// No comprueba que el buzón exista (no se envía nada): el gate es solo por dominio.
export function emailPermitido(email: string | null | undefined): boolean {
  if (!email) return false;
  const limpio = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return false;
  const dominio = limpio.split("@")[1];
  return dominiosPermitidos().includes(dominio);
}
