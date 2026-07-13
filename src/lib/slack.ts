import "server-only";

import { WebClient } from "@slack/web-api";
import { env } from "@/lib/env";
import type { Adjunto } from "@/lib/report";

function slack(): WebClient {
  return new WebClient(env.slackBotToken());
}

// True si Slack está configurado (hay bot token). Permite features opcionales sin romper.
export function slackConfigurado(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN);
}

// Conversión ligera de Markdown (GitHub) a mrkdwn (Slack) para volcar el análisis de la IA al hilo.
export function mdASlack(md: string): string {
  return md
    .replace(/^#{1,6}\s*(.+)$/gm, "*$1*") // encabezados -> negrita
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>") // enlaces
    .replace(/\*\*([^*]+)\*\*/g, "*$1*") // **negrita** -> *negrita*
    .replace(/^\s*-\s/gm, "• "); // viñetas
}

// Publica un mensaje en el hilo de seguimiento de un bug (thread_ts = ts del aviso).
export async function responderEnHilo(channel: string, threadTs: string, texto: string): Promise<void> {
  if (!slackConfigurado()) return;
  try {
    await slack().chat.postMessage({ channel, thread_ts: threadTs, text: texto, unfurl_links: false });
  } catch (err) {
    console.error("Error respondiendo en el hilo de Slack:", err);
  }
}

// Busca un usuario de Slack por su correo. Devuelve nombre e id, o null si no hay token
// o no se encuentra. Requiere el scope users:read.email en el bot.
export async function buscarSlackPorEmail(
  email: string
): Promise<{ id: string; nombre: string } | null> {
  if (!slackConfigurado()) return null;
  try {
    const res = await slack().users.lookupByEmail({ email });
    if (!res.ok || !res.user?.id) return null;
    const nombre =
      res.user.real_name || res.user.profile?.real_name || res.user.name || email.split("@")[0];
    return { id: res.user.id, nombre };
  } catch {
    return null;
  }
}

// Datos completos de un reporte, suficientes para reconstruir su aviso en cualquier estado.
// Al guardarlos en `reportes`, el webhook y el endpoint de interacciones pueden re-generar
// el mensaje idéntico (esto es lo que resuelve el issue de "reconstruir el post completo").
export type DatosAviso = {
  tipo: "bug" | "sugerencia";
  producto: string;
  tituloIssue: string;
  urlIssue: string;
  descripcion: string;
  adjuntos: Adjunto[];
  reporter: string;
  reporterEmail: string;
  reporterSlackId?: string | null; // si se resuelve por email, se menciona al reporter
  repo: string;
  issueNumber: number;
  devsSlack?: string[]; // menciones (solo bug, estado abierto)
  asignadoSlackId?: string | null; // quién se encarga, si ya está asignado
};

export type MensajeSlack = {
  channel: string;
  ts: string;
  permalink: string | null;
};

type EstadoAviso = "abierto" | "asignado" | "cerrado";

// Fuente única de verdad del aviso: genera los bloques según tipo y estado.
// - abierto: aviso completo + botón "Me encargo" (bug: menciona a los devs).
// - asignado: idéntico, pero sin botón "Me encargo" y con "Se encarga @X".
// - cerrado: versión mínima (cabecera + enlace), sin botón, para distinguirlo del abierto.
function construirBloques(d: DatosAviso, estado: EstadoAviso): { blocks: unknown[]; text: string } {
  const esSug = d.tipo === "sugerencia";
  const quienReporta = d.reporterSlackId ? `<@${d.reporterSlackId}>` : `*${d.reporter}*`;
  const etiquetaReporta = esSug ? "Sugerida por" : "Reporta";

  if (estado === "cerrado") {
    const cab = `:white_check_mark: *${esSug ? "Sugerencia resuelta" : "Resuelto"} - ${d.producto}*`;
    return {
      blocks: [{ type: "section", text: { type: "mrkdwn", text: `${cab}\n<${d.urlIssue}|${d.tituloIssue}>` } }],
      text: `${esSug ? "Sugerencia resuelta" : "Resuelto"} en ${d.producto}: ${d.tituloIssue}`,
    };
  }

  const cab = esSug ? `:bulb: *Nueva sugerencia en ${d.producto}*` : `:beetle: *Nuevo bug en ${d.producto}*`;
  const desc = d.descripcion.trim();
  const descCorta = desc.length > 2500 ? `${desc.slice(0, 2500)}…` : desc;
  const imagenes = d.adjuntos.filter((a) => a.tipo === "imagen");
  const videos = d.adjuntos.filter((a) => a.tipo === "video");

  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text: cab } },
    { type: "section", text: { type: "mrkdwn", text: `*${d.tituloIssue}*\n${descCorta || "_(sin descripción)_"}` } },
  ];
  for (const img of imagenes.slice(0, 5)) {
    blocks.push({ type: "image", image_url: img.url, alt_text: img.nombre });
  }
  if (videos.length > 0) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `:movie_camera: ${videos.map((v) => `<${v.url}|${v.nombre}>`).join("  ·  ")}` }],
    });
  }
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: `:bust_in_silhouette: ${etiquetaReporta} ${quienReporta} (${d.reporterEmail})` }],
  });

  // Línea de "quién se encarga" (asignado) o menciones a los devs (bug recién abierto).
  if (estado === "asignado" && d.asignadoSlackId) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `:raising_hand: Se encarga <@${d.asignadoSlackId}>` } });
  } else if (estado === "abierto" && !esSug && d.devsSlack && d.devsSlack.length) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: d.devsSlack.map((id) => `<@${id}>`).join(" ") } });
  }

  // Botones: en abierto, "Me encargo" + "Ver issue"; en asignado, solo "Ver issue".
  const elements: unknown[] = [];
  if (estado === "abierto") {
    elements.push({
      type: "button",
      text: { type: "plain_text", text: "🙋 Me encargo", emoji: true },
      style: "primary",
      action_id: esSug ? "asignar_sugerencia" : "asignar_bug",
      value: `${d.repo}#${d.issueNumber}`,
    });
  }
  elements.push({ type: "button", text: { type: "plain_text", text: "Ver issue en GitHub", emoji: true }, url: d.urlIssue });
  blocks.push({ type: "actions", elements });

  return { blocks, text: `${esSug ? "Sugerencia" : "Bug"} en ${d.producto}: ${d.tituloIssue}` };
}

// Postea el aviso de un nuevo reporte (bug o sugerencia) y abre su hilo de seguimiento.
export async function avisarNuevoReporte(d: DatosAviso): Promise<MensajeSlack> {
  const client = slack();
  const { blocks, text } = construirBloques(d, "abierto");
  const res = await client.chat.postMessage({
    channel: env.slackBugChannel(),
    text,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: blocks as any,
  });
  if (!res.ok || !res.ts || !res.channel) {
    throw new Error(`Slack no devolvió ts al postear: ${res.error ?? "desconocido"}`);
  }

  let permalink: string | null = null;
  try {
    const p = await client.chat.getPermalink({ channel: res.channel, message_ts: res.ts });
    permalink = p.ok ? p.permalink ?? null : null;
  } catch {
    permalink = null;
  }

  await responderEnHilo(
    res.channel,
    res.ts,
    ":thread: *Seguimiento y actualizaciones* — aquí se registran el estado y el análisis. Comentad lo que haga falta."
  );

  return { channel: res.channel, ts: res.ts, permalink };
}

// Reescribe el aviso tras asignarlo: idéntico pero sin botón "Me encargo" y con "Se encarga @X".
export async function marcarAsignado(
  channel: string,
  ts: string,
  d: DatosAviso,
  asignadoSlackId: string
): Promise<void> {
  const { blocks, text } = construirBloques({ ...d, asignadoSlackId }, "asignado");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await slack().chat.update({ channel, ts, text, blocks: blocks as any });
}

// Marca el aviso como resuelto (o lo revierte). Al reabrir reconstruye el aviso COMPLETO
// (asignado si tenía dueño, o abierto con botón), no una versión pobre.
export async function actualizarEstado(
  channel: string,
  ts: string,
  resuelto: boolean,
  d: DatosAviso
): Promise<void> {
  const estado: EstadoAviso = resuelto ? "cerrado" : d.asignadoSlackId ? "asignado" : "abierto";
  const { blocks, text } = construirBloques(d, estado);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await slack().chat.update({ channel, ts, text, blocks: blocks as any });
}

// Obtiene la URL del avatar de Slack de un usuario (para mostrarlo en el panel).
// Se cachea en la fila al asignar, para no llamar a users.info en cada carga.
export async function avatarDeSlack(userId: string): Promise<string | null> {
  if (!slackConfigurado()) return null;
  try {
    const res = await slack().users.info({ user: userId });
    if (!res.ok || !res.user) return null;
    const p = res.user.profile;
    return p?.image_192 || p?.image_72 || p?.image_48 || null;
  } catch {
    return null;
  }
}
