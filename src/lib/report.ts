// Tipos y utilidades del reporte, compartidos entre cliente y servidor.

export type TipoAdjunto = "imagen" | "video";

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
  meta: MetaReporte
): string {
  const partes: string[] = [];

  // Descripción tal cual la escribió la persona.
  partes.push("## Descripción");
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
  partes.push("## Datos del reporte");
  partes.push(
    [
      "| | |",
      "|---|---|",
      `| **Reportado por** | ${reporter.nombre} (${reporter.email}) |`,
      `| **Fecha** | ${meta.fecha} |`,
      `| **Origen** | ${meta.urlOrigen} |`,
      `| **Navegador** | ${meta.navegador} |`,
    ].join("\n")
  );

  return partes.join("\n\n");
}
