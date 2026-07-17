import "server-only";
import crypto from "crypto";
import type { NextRequest } from "next/server";

// Segunda vía de autenticación de la API pública de reportes (issue #32).
//
// Hay dos formas de llegar a /api/report y /api/upload-url:
//
// - Vía web: la de siempre. Sin cabecera de secreto. La identidad la declara el
//   navegador (gate de correo) y solo se valida por dominio.
// - Vía de confianza: llamada de servidor a servidor (ej. Metriks) con la cabecera
//   `x-bug-portal-secret`. Quien llama ya ha verificado la identidad del reporter,
//   así que su `reporter` es fiable. Aun así se sigue validando el dominio del correo
//   como defensa en profundidad.
//
// Si no hay BUG_PORTAL_SECRET en el entorno, la vía de confianza no existe: cualquier
// llamada con cabecera se rechaza, pero la vía web sigue funcionando igual.

export const CABECERA_SECRETO = "x-bug-portal-secret";

export type ResultadoAuth =
  | { tipo: "web" } // Sin cabecera: flujo del navegador de toda la vida.
  | { tipo: "confianza" } // Cabecera con secreto válido: nos fiamos del reporter del body.
  | { tipo: "rechazada" }; // Cabecera presente pero inválida (o sin secreto configurado).

// Comparación en tiempo constante para no filtrar el secreto carácter a carácter.
// timingSafeEqual exige buffers del mismo tamaño, de ahí la comprobación previa.
function comparaSegura(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Clasifica la petición en una de las dos vías. No lanza: quien llama decide el 401.
export function autenticarLlamada(request: NextRequest): ResultadoAuth {
  const cabecera = request.headers.get(CABECERA_SECRETO);
  if (!cabecera) return { tipo: "web" };

  const secreto = process.env.BUG_PORTAL_SECRET ?? "";
  if (!secreto) return { tipo: "rechazada" };

  return comparaSegura(cabecera, secreto) ? { tipo: "confianza" } : { tipo: "rechazada" };
}
