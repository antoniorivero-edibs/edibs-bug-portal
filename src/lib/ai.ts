import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { leerArbolRepo, leerFichero } from "@/lib/github";
import { CATEGORIAS_SUGERIDAS } from "@/lib/products";

// Modelo por defecto: Sonnet 5 (potente para localizar el fallo, coste contenido).
// Configurable por env por si se quiere subir a Opus o bajar a Haiku.
const MODELO = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Límites para acotar coste y latencia de la investigación del repo.
const MAX_FICHEROS_INVESTIGAR = 6;
const MAX_RUTAS_FASE1 = 800;

export function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function cliente(): Anthropic {
  return new Anthropic(); // lee ANTHROPIC_API_KEY del entorno
}

function texto(res: Anthropic.Message): string {
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export type Triaje = { comentario: string; labels: string[] };

// COMENTARIO 1 (rápido, solo del texto): resumen, qué ocurre, severidad, categoría.
// Devuelve el markdown del comentario y las labels que Claude decide aplicar.
export async function triajeBug(
  titulo: string,
  descripcion: string,
  producto: string
): Promise<Triaje | null> {
  if (!iaConfigurada()) return null;

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      resumen: { type: "string" },
      que_ocurre: { type: "string" },
      severidad: { type: "string", enum: ["baja", "media", "alta", "critica"] },
      justificacion_severidad: { type: "string" },
      labels: { type: "array", items: { type: "string" } },
    },
    required: ["resumen", "que_ocurre", "severidad", "justificacion_severidad", "labels"],
  };

  const sistema =
    "Eres un asistente de triaje de bugs del equipo de producto de EDIBS. " +
    "A partir de un reporte en lenguaje natural produces un triaje breve y en español. " +
    "No inventes: si un dato no está, dilo. Devuelves JSON según el esquema.";

  const usuario = [
    `Producto: ${producto}`,
    `Título: ${titulo}`,
    "",
    "Reporte del usuario:",
    descripcion,
    "",
    `Categorías sugeridas (puedes usar otras si encajan mejor): ${CATEGORIAS_SUGERIDAS.join(", ")}.`,
    "En 'labels' devuelve en minúsculas y kebab-case todas las etiquetas aplicables:",
    "la categoría/área principal y, si procede, tipo o subsistema (p. ej. frontend, auth, api-estados).",
  ].join("\n");

  try {
    const res = await cliente().messages.create({
      model: MODELO,
      max_tokens: 1200,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema } },
      system: sistema,
      messages: [{ role: "user", content: usuario }],
    });

    const datos = JSON.parse(texto(res)) as {
      resumen: string;
      que_ocurre: string;
      severidad: string;
      justificacion_severidad: string;
      labels: string[];
    };

    const labels = [...new Set((datos.labels || []).map((l) => l.trim().toLowerCase()).filter(Boolean))];

    const comentario = [
      "## 🔎 Triaje automático",
      "",
      `**Resumen:** ${datos.resumen}`,
      `**Qué ocurre:** ${datos.que_ocurre}`,
      `**Severidad sugerida:** ${datos.severidad} — ${datos.justificacion_severidad}`,
      labels.length ? `**Categoría / etiquetas:** ${labels.join(", ")}` : "",
      "",
      "_Análisis automático (IA). La severidad es una sugerencia; el equipo decide al triar._",
    ]
      .filter(Boolean)
      .join("\n");

    return { comentario, labels };
  } catch (err) {
    console.error("Error en el triaje con IA:", err);
    return null;
  }
}

// COMENTARIO 2 (más lento, leyendo el repo): causa probable + ficheros/áreas candidatas.
// Fase 1: Claude elige ficheros probables a partir de las rutas.
// Fase 2: se lee su contenido y Claude señala causa y zonas concretas.
export async function investigarRepo(
  titulo: string,
  descripcion: string,
  producto: string,
  repo: string
): Promise<string | null> {
  if (!iaConfigurada()) return null;

  let rutas: string[];
  try {
    rutas = await leerArbolRepo(repo);
  } catch (err) {
    console.error("No se pudo leer el árbol del repo:", err);
    return null;
  }
  if (rutas.length === 0) return null;

  const client = cliente();
  const contextoBug = `Producto: ${producto}\nTítulo: ${titulo}\n\nReporte:\n${descripcion}`;

  // --- Fase 1: elegir ficheros candidatos ---
  let candidatos: string[] = [];
  try {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: { ficheros: { type: "array", items: { type: "string" } } },
      required: ["ficheros"],
    };
    const res = await client.messages.create({
      model: MODELO,
      max_tokens: 600,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema } },
      system:
        "Eres un ingeniero que localiza en qué ficheros de un repo está probablemente un bug. " +
        "Devuelves solo las rutas más probables (máximo " + MAX_FICHEROS_INVESTIGAR + "), de la lista dada.",
      messages: [
        {
          role: "user",
          content: `${contextoBug}\n\nRutas del repositorio:\n${rutas.slice(0, MAX_RUTAS_FASE1).join("\n")}`,
        },
      ],
    });
    const datos = JSON.parse(texto(res)) as { ficheros: string[] };
    candidatos = (datos.ficheros || []).filter((f) => rutas.includes(f)).slice(0, MAX_FICHEROS_INVESTIGAR);
  } catch (err) {
    console.error("Error eligiendo ficheros candidatos:", err);
    return null;
  }
  if (candidatos.length === 0) return null;

  // --- Fase 2: leer contenidos y analizar ---
  const contenidos: string[] = [];
  for (const path of candidatos) {
    const c = await leerFichero(repo, path);
    if (c) contenidos.push(`--- ${path} ---\n${c}`);
  }
  if (contenidos.length === 0) return null;

  // URL base para enlazar ficheros (HEAD resuelve a la rama por defecto en GitHub).
  const base = `https://github.com/${env.githubOrg()}/${repo}/blob/HEAD/`;

  try {
    const res = await client.messages.create({
      model: MODELO,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system:
        "Eres un ingeniero senior. A partir de un reporte de bug y el contenido de unos ficheros del repo, " +
        "acotas la causa probable y señalas las zonas concretas (fichero, función o líneas) donde mirar. " +
        "Objetivo: que otro dev con Claude Code retome el issue con la mayor parte del camino hecho. " +
        "Sé concreto y honesto: si no estás seguro, dilo. Responde en español y en Markdown, sin preámbulos. " +
        `Enlaza cada fichero como [ruta](${base}ruta).`,
      messages: [
        {
          role: "user",
          content:
            `${contextoBug}\n\nContenido de los ficheros candidatos:\n\n${contenidos.join("\n\n")}\n\n` +
            "Devuelve el análisis con estas secciones:\n" +
            "**Causa probable:** ...\n" +
            "**Ficheros / áreas candidatas:** lista con enlace y qué revisar en cada uno (función/línea si puedes).\n" +
            "**Para el dev:** pistas para continuar y qué verificar.",
        },
      ],
    });

    const analisis = texto(res);
    if (!analisis) return null;
    return [
      "## 🧭 Investigación del código",
      "",
      analisis,
      "",
      "_Análisis automático (IA) leyendo el repositorio. Puede contener errores; verifícalo antes de asumirlo._",
    ].join("\n");
  } catch (err) {
    console.error("Error analizando el código:", err);
    return null;
  }
}
