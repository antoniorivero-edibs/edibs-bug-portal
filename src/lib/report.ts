// Tipos y utilidades del reporte, compartidos entre cliente y servidor.

export type TipoAdjunto = "imagen" | "video";

// Tipo de reporte: bug (fallo) o sugerencia (función/cambio/mejora).
export type TipoReporte = "bug" | "sugerencia";

export function esTipoReporte(v: unknown): v is TipoReporte {
  return v === "bug" || v === "sugerencia";
}

export type Adjunto = {
  nombre: string;
  url: string; // URL pública en Supabase Storage
  tipo: TipoAdjunto;
  tamano: number; // bytes
};

export type Reporter = {
  nombre: string;
  email: string;
};

export type MetaReporte = {
  fecha: string; // ISO
  navegador: string; // user agent
  urlOrigen: string; // desde dónde se reporta
  // App que envía el reporte (ej. "Metriks"). Solo llega por la vía de confianza
  // (llamada de servidor a servidor); desde el navegador va vacío.
  origenApp?: string;
};

// Límites de adjuntos (issue #5).
export const MAX_ADJUNTOS = 5;
export const MAX_BYTES_ADJUNTO = 50 * 1024 * 1024; // 50 MB

export const EXTENSIONES_IMAGEN = ["png", "jpg", "jpeg", "webp", "gif"];
export const EXTENSIONES_VIDEO = ["mp4", "mov", "webm"];

export function tipoPorNombre(nombre: string): TipoAdjunto | null {
  const ext = nombre.split(".").pop()?.toLowerCase() ?? "";
  if (EXTENSIONES_IMAGEN.includes(ext)) return "imagen";
  if (EXTENSIONES_VIDEO.includes(ext)) return "video";
  return null;
}

// Limpia el nombre de fichero para usarlo en la ruta de Storage (sin acentos ni símbolos).
export function saneaNombreArchivo(nombre: string): string {
  const base = nombre.replace(/\.[^.]+$/, "");
  return (
    base
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "archivo"
  );
}

// Construye el cuerpo del issue en Markdown, bien estructurado.
// Conserva el texto original del reporter y añade adjuntos y metadatos.
export function construirCuerpoIssue(
  descripcion: string,
  adjuntos: Adjunto[],
  reporter: Reporter,
  meta: MetaReporte,
  tipo: TipoReporte = "bug"
): string {
  const partes: string[] = [];

  // Texto tal cual lo escribió la persona (el encabezado cambia según el tipo).
  partes.push(tipo === "sugerencia" ? "## Sugerencia" : "## Descripción");
  partes.push(descripcion.trim() || "_(Sin descripción)_");

  // Adjuntos: imágenes incrustadas, vídeos como enlace.
  partes.push("## Adjuntos");
  if (adjuntos.length === 0) {
    partes.push("_Sin adjuntos._");
  } else {
    const imagenes = adjuntos.filter((a) => a.tipo === "imagen");
    const videos = adjuntos.filter((a) => a.tipo === "video");
    const bloques: string[] = [];
    if (imagenes.length > 0) {
      bloques.push(imagenes.map((a) => `![${a.nombre}](${a.url})`).join("\n\n"));
    }
    if (videos.length > 0) {
      bloques.push(
        "**Vídeos**\n" + videos.map((a) => `- [${a.nombre}](${a.url})`).join("\n")
      );
    }
    partes.push(bloques.join("\n\n"));
  }

  // Metadatos del reporte, en tabla para que se lea limpio.
  // "Reportado desde" solo aparece si el reporte llega de otra app (vía de confianza).
  partes.push("## Datos del reporte");
  const filas = [
    "| | |",
    "|---|---|",
    `| **Reportado por** | ${reporter.nombre} (${reporter.email}) |`,
  ];
  if (meta.origenApp) {
    filas.push(`| **Reportado desde** | ${meta.origenApp} |`);
  }
  filas.push(
    `| **Fecha** | ${meta.fecha} |`,
    `| **Origen** | ${meta.urlOrigen} |`,
    `| **Navegador** | ${meta.navegador} |`
  );
  partes.push(filas.join("\n"));

  return partes.join("\n\n");
}
