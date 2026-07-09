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

export type AvisoSlack = {
  producto: string;
  tituloIssue: string;
  urlIssue: string;
  descripcion: string;
  adjuntos: Adjunto[];
  reporter: string;
  reporterEmail: string;
  reporterSlackId?: string | null; // si se resuelve por email, se menciona al reporter
  devsSlack: string[];
};

export type MensajeSlack = {
  channel: string;
  ts: string;
  permalink: string | null;
};

// Postea el aviso del nuevo bug en #bug y devuelve el ts para poder actualizarlo luego.
export async function avisarNuevoBug(aviso: AvisoSlack): Promise<MensajeSlack> {
  const client = slack();
  const canal = env.slackBugChannel();
  const menciones = aviso.devsSlack.map((id) => `<@${id}>`).join(" ");
  const quienReporta = aviso.reporterSlackId ? `<@${aviso.reporterSlackId}>` : `*${aviso.reporter}*`;
  const desc = aviso.descripcion.trim();
  const descCorta = desc.length > 2500 ? `${desc.slice(0, 2500)}…` : desc;

  const imagenes = aviso.adjuntos.filter((a) => a.tipo === "imagen");
  const videos = aviso.adjuntos.filter((a) => a.tipo === "video");

  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text: `:beetle: *Nuevo bug en ${aviso.producto}*` } },
    { type: "section", text: { type: "mrkdwn", text: `*${aviso.tituloIssue}*\n${descCorta || "_(sin descripción)_"}` } },
  ];

  // Imágenes incrustadas directamente en el mensaje.
  for (const img of imagenes.slice(0, 5)) {
    blocks.push({ type: "image", image_url: img.url, alt_text: img.nombre });
  }
  // Vídeos como enlace.
  if (videos.length > 0) {
    blocks.push({
      type: "context",
      elements: [
        { type: "mrkdwn", text: `:movie_camera: ${videos.map((v) => `<${v.url}|${v.nombre}>`).join("  ·  ")}` },
      ],
    });
  }

  blocks.push(
    // Quién reporta (mencionado para poder escribirle por DM) en su propia línea.
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `:bust_in_silhouette: Reporta ${quienReporta} (${aviso.reporterEmail})` },
      ],
    }
  );
  // Menciones a los devs en línea aparte (sin "cc").
  if (menciones) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: menciones } });
  }
  blocks.push({
    type: "actions",
    elements: [
      { type: "button", text: { type: "plain_text", text: "Ver issue en GitHub", emoji: true }, url: aviso.urlIssue },
    ],
  });

  const res = await client.chat.postMessage({
    channel: canal,
    text: `Nuevo bug en ${aviso.producto}: ${aviso.tituloIssue} ${menciones}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: blocks as any,
  });

  if (!res.ok || !res.ts || !res.channel) {
    throw new Error(`Slack no devolvió ts al postear: ${res.error ?? "desconocido"}`);
  }

  // Permalink del mensaje (para enlazarlo desde el panel). Best-effort.
  let permalink: string | null = null;
  try {
    const p = await client.chat.getPermalink({ channel: res.channel, message_ts: res.ts });
    permalink = p.ok ? p.permalink ?? null : null;
  } catch {
    permalink = null;
  }

  // Abre el hilo de seguimiento: aquí caerán el estado, el análisis de la IA y los comentarios.
  await responderEnHilo(
    res.channel,
    res.ts,
    ":thread: *Seguimiento y actualizaciones* — aquí se registran el estado y el análisis de la IA. Comentad lo que haga falta."
  );

  return { channel: res.channel, ts: res.ts, permalink };
}

export type AvisoSugerencia = Omit<AvisoSlack, "devsSlack"> & {
  repo: string;
  issueNumber: number;
};

// Postea el aviso de una nueva sugerencia: sin mención, con botón "Me la quedo".
// El value del botón lleva repo+issue para que el endpoint de interacciones sepa qué asignar.
export async function avisarNuevaSugerencia(aviso: AvisoSugerencia): Promise<MensajeSlack> {
  const client = slack();
  const canal = env.slackBugChannel();
  const quienReporta = aviso.reporterSlackId ? `<@${aviso.reporterSlackId}>` : `*${aviso.reporter}*`;
  const desc = aviso.descripcion.trim();
  const descCorta = desc.length > 2500 ? `${desc.slice(0, 2500)}…` : desc;
  const imagenes = aviso.adjuntos.filter((a) => a.tipo === "imagen");

  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text: `:bulb: *Nueva sugerencia en ${aviso.producto}*` } },
    { type: "section", text: { type: "mrkdwn", text: `*${aviso.tituloIssue}*\n${descCorta || "_(sin descripción)_"}` } },
  ];
  for (const img of imagenes.slice(0, 5)) {
    blocks.push({ type: "image", image_url: img.url, alt_text: img.nombre });
  }
  blocks.push(
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `:bust_in_silhouette: Sugerida por ${quienReporta} (${aviso.reporterEmail})` }],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "🙋 Me la quedo", emoji: true },
          style: "primary",
          action_id: "asignar_sugerencia",
          value: `${aviso.repo}#${aviso.issueNumber}`,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Ver issue", emoji: true },
          url: aviso.urlIssue,
        },
      ],
    }
  );

  const res = await client.chat.postMessage({
    channel: canal,
    text: `Nueva sugerencia en ${aviso.producto}: ${aviso.tituloIssue}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: blocks as any,
  });
  if (!res.ok || !res.ts || !res.channel) {
    throw new Error(`Slack no devolvió ts al postear la sugerencia: ${res.error ?? "desconocido"}`);
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
    ":thread: *Seguimiento* — pulsad *Me la quedo* para asignárosla. Aquí van las actualizaciones."
  );

  return { channel: res.channel, ts: res.ts, permalink };
}

// Edita el aviso de una sugerencia tras asignarla: quita el botón y muestra quién se la quedó.
export async function marcarSugerenciaAsignada(
  channel: string,
  ts: string,
  datos: { producto: string; tituloIssue: string; urlIssue: string; reporter: string; reporterEmail: string; asignadoSlackId: string }
): Promise<void> {
  const client = slack();
  await client.chat.update({
    channel,
    ts,
    text: `Sugerencia en ${datos.producto} asignada`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `:bulb: *Sugerencia en ${datos.producto}*` } },
      { type: "section", text: { type: "mrkdwn", text: `<${datos.urlIssue}|${datos.tituloIssue}>` } },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `:raising_hand: Asignada a <@${datos.asignadoSlackId}>  ·  sugerida por *${datos.reporter}* (${datos.reporterEmail})` },
        ],
      },
    ],
  });
}

// Marca el aviso como resuelto (o lo revierte) actualizando el mensaje existente.
export async function actualizarEstadoBug(
  channel: string,
  ts: string,
  resuelto: boolean,
  datos: { producto: string; tituloIssue: string; urlIssue: string }
): Promise<void> {
  const client = slack();
  const cabecera = resuelto
    ? `:white_check_mark: *Resuelto - ${datos.producto}*`
    : `:beetle: *Nuevo bug en ${datos.producto}*`;

  await client.chat.update({
    channel,
    ts,
    text: `${resuelto ? "Resuelto" : "Bug"} en ${datos.producto}: ${datos.tituloIssue}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${cabecera}\n<${datos.urlIssue}|${datos.tituloIssue}>`,
        },
      },
    ],
  });
}
