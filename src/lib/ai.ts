import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// Modelo por defecto. Se puede cambiar por env (p. ej. claude-sonnet-5 para abaratar).
const MODELO = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

// True si la IA está configurada (hay API key). Si no, se salta el análisis.
export function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Genera un comentario estructurado del bug con Claude, conservando el texto original.
// Devuelve el markdown del comentario, o null si la IA no está configurada o falla.
export async function analizarBug(
  titulo: string,
  descripcion: string,
  producto: string
): Promise<string | null> {
  if (!iaConfigurada()) return null;

  const client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno

  const sistema = [
    "Eres un asistente de triaje de bugs para el equipo de producto de EDIBS.",
    "A partir de un reporte en lenguaje natural, produces un comentario breve y estructurado en español.",
    "No inventes información: si un dato no está en el reporte, escribe \"No especificado\".",
    "No repitas literalmente el reporte original (ya está en el issue); resúmelo y estructúralo.",
    "Responde SOLO con el comentario en Markdown, sin preámbulos.",
  ].join(" ");

  const usuario = [
    `Producto: ${producto}`,
    `Título: ${titulo}`,
    "",
    "Reporte:",
    descripcion,
    "",
    "Estructura el comentario con estas secciones (usa este formato exacto):",
    "**Resumen:** una frase.",
    "**Pasos para reproducir:** lista numerada (o \"No especificado\").",
    "**Comportamiento esperado:** ...",
    "**Comportamiento real:** ...",
    "**Área probable:** ...",
    "**Severidad sugerida:** una de baja / media / alta / crítica, con media frase de justificación.",
  ].join("\n");

  try {
    const res = await client.messages.create({
      model: MODELO,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: sistema,
      messages: [{ role: "user", content: usuario }],
    });

    const texto = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!texto) return null;
    return `### Análisis automático (IA)\n\n${texto}\n\n_Generado automáticamente a partir del reporte original._`;
  } catch (err) {
    console.error("Error analizando el bug con IA:", err);
    return null;
  }
}
