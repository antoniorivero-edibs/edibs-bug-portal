import "server-only";

import { WebClient } from "@slack/web-api";
import { env } from "@/lib/env";

function slack(): WebClient {
  return new WebClient(env.slackBotToken());
}

export type AvisoSlack = {
  producto: string;
  tituloIssue: string;
  urlIssue: string;
  reporter: string;
  reporterEmail: string;
  devsSlack: string[];
};

export type MensajeSlack = {
  channel: string;
  ts: string;
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
            // Se muestra nombre y correo del que reporta para poder escribirle si hace falta.
            text: `Reportado por *${aviso.reporter}* (${aviso.reporterEmail})${menciones ? ` · ${menciones}` : ""}`,
          },
        ],
      },
    ],
  });

  if (!res.ok || !res.ts || !res.channel) {
    throw new Error(`Slack no devolvió ts al postear: ${res.error ?? "desconocido"}`);
  }
  return { channel: res.channel, ts: res.ts };
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
