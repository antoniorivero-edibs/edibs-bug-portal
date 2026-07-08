// Lógica de dominios permitidos, compartida entre cliente y servidor.
// Se lee de NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS para que esté disponible en ambos lados.

const POR_DEFECTO = "edibschool.com,nuclio.school,indexmediamarketing.com";

export function dominiosPermitidos(): string[] {
  return (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || POR_DEFECTO)
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

// Valida formato básico de email y que su dominio esté en la lista permitida.
// No comprueba que el buzón exista (no se envía nada): el gate es solo por dominio.
export function emailPermitido(email: string | null | undefined): boolean {
  if (!email) return false;
  const limpio = email.trim().toLowerCase();
  // Formato mínimo: algo@algo.tld
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return false;
  const dominio = limpio.split("@")[1];
  return dominiosPermitidos().includes(dominio);
}
