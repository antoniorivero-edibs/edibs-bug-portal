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

// Construye el cuerpo del issue en Markdown.
// Conserva el texto original del reporter y añade adjuntos y metadatos.
export function construirCuerpoIssue(
  descripcion: string,
  adjuntos: Adjunto[],
  reporter: Reporter,
  meta: MetaReporte
): string {
  const partes: string[] = [];

  partes.push(descripcion.trim() || "_(Sin descripción)_");

  const imagenes = adjuntos.filter((a) => a.tipo === "imagen");
  const videos = adjuntos.filter((a) => a.tipo === "video");

  if (imagenes.length > 0) {
    partes.push("### Capturas");
    // Las imágenes se incrustan para que se vean en el issue.
    partes.push(imagenes.map((a) => `![${a.nombre}](${a.url})`).join("\n"));
  }

  if (videos.length > 0) {
    partes.push("### Vídeos");
    // Los vídeos van como enlace.
    partes.push(videos.map((a) => `- [${a.nombre}](${a.url})`).join("\n"));
  }

  partes.push("---");
  partes.push(
    [
      `**Reportado por:** ${reporter.nombre} (${reporter.email})`,
      `**Fecha:** ${meta.fecha}`,
      `**Origen:** ${meta.urlOrigen}`,
      `**Navegador:** ${meta.navegador}`,
    ].join("\n")
  );

  return partes.join("\n\n");
}
