import "server-only";

import { WebClient } from "@slack/web-api";
import { env } from "@/lib/env";

function slack(): WebClient {
  return new WebClient(env.slackBotToken());
}

// True si Slack está configurado (hay bot token). Permite features opcionales sin romper.
export function slackConfigurado(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN);
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

  const res = await client.chat.postMessage({
    channel: canal,
    text: `Nuevo bug en ${aviso.producto}: ${aviso.tituloIssue}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:beetle: *Nuevo bug en ${aviso.producto}*\n<${aviso.urlIssue}|${aviso.tituloIssue}>`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            // Se muestra quién reporta (mencionado si está en Slack) y su correo, para poder escribirle.
            text: `Reportado por ${aviso.reporterSlackId ? `<@${aviso.reporterSlackId}>` : `*${aviso.reporter}*`} (${aviso.reporterEmail})${menciones ? ` · avisados: ${menciones}` : ""}`,
          },
        ],
      },
    ],
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

  return { channel: res.channel, ts: res.ts, permalink };
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
