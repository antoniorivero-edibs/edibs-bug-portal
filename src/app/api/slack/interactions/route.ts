import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/env";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { reasignarIssue } from "@/lib/github";
import { githubDeSlack, aliasDeRepo } from "@/lib/products";
import { marcarAsignado, avatarDeSlack, type DatosAviso } from "@/lib/slack";
import type { Adjunto } from "@/lib/report";

// Verifica la firma del payload de Slack (evita clics falsificados).
function firmaValida(body: string, timestamp: string, firma: string): boolean {
  // Rechaza peticiones de más de 5 minutos (replay).
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) return false;
  const base = `v0:${timestamp}:${body}`;
  const esperada =
    "v0=" + crypto.createHmac("sha256", env.slackSigningSecret()).update(base).digest("hex");
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Endpoint de interacciones de Slack: recibe el clic del botón "Me encargo" (bug o sugerencia),
// asigna el issue a quien pulsa (si es del equipo) y reescribe el mensaje quitando el botón.
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp") ?? "";
  const firma = request.headers.get("x-slack-signature") ?? "";
  if (!firmaValida(raw, timestamp, firma)) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  // El payload viene como application/x-www-form-urlencoded con un campo "payload" en JSON.
  const params = new URLSearchParams(raw);
  const payload = params.get("payload");
  if (!payload) return NextResponse.json({ ok: true });

  let data: {
    type?: string;
    user?: { id?: string };
    actions?: { action_id?: string; value?: string }[];
    channel?: { id?: string };
    message?: { ts?: string };
  };
  try {
    data = JSON.parse(payload);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const accion = data.actions?.[0];
  const esAsignar = accion?.action_id === "asignar_bug" || accion?.action_id === "asignar_sugerencia";
  if (data.type !== "block_actions" || !esAsignar) {
    return NextResponse.json({ ok: true });
  }

  const slackUserId = data.user?.id ?? "";
  const github = githubDeSlack(slackUserId);
  const channel = data.channel?.id ?? "";
  const ts = data.message?.ts ?? "";
  const [repo, numStr] = (accion!.value ?? "").split("#");
  const numero = Number.parseInt(numStr ?? "", 10);

  // Solo el equipo puede autoasignarse. Si no está en el mapa, avisa efímeramente.
  if (!github) {
    return NextResponse.json({
      response_type: "ephemeral",
      replace_original: false,
      text: "Solo el equipo de desarrollo puede autoasignarse un reporte.",
    });
  }
  if (!repo || !Number.isFinite(numero)) return NextResponse.json({ ok: true });

  try {
    // 1. Reasignar el issue en GitHub (reemplaza asignados: en bugs, quita al otro).
    await reasignarIssue(repo, numero, github);

    // 2. Leer la fila completa (para reconstruir el aviso idéntico) y guardar la asignación.
    const admin = crearClienteAdmin();
    const { data: reporte } = await admin
      .from("reportes")
      .select(
        "tipo, titulo, issue_url, descripcion, adjuntos, reporter_nombre, reporter_email, reporter_slack_id"
      )
      .eq("repo", repo)
      .eq("issue_number", numero)
      .maybeSingle();

    // Avatar de Slack de quien se encarga (cacheado para el panel). Best-effort.
    const avatar = await avatarDeSlack(slackUserId);

    await admin
      .from("reportes")
      .update({ asignado_github: github, asignado_slack: slackUserId, asignado_slack_avatar: avatar })
      .eq("repo", repo)
      .eq("issue_number", numero);

    // 3. Reescribir el mensaje: idéntico, sin botón "Me encargo" y con "Se encarga @X".
    if (channel && ts && reporte) {
      const datos: DatosAviso = {
        tipo: reporte.tipo === "sugerencia" ? "sugerencia" : "bug",
        producto: aliasDeRepo(repo),
        tituloIssue: reporte.titulo,
        urlIssue: reporte.issue_url,
        descripcion: reporte.descripcion ?? "",
        adjuntos: (reporte.adjuntos as Adjunto[]) ?? [],
        reporter: reporte.reporter_nombre ?? reporte.reporter_email,
        reporterEmail: reporte.reporter_email,
        reporterSlackId: reporte.reporter_slack_id ?? null,
        repo,
        issueNumber: numero,
      };
      await marcarAsignado(channel, ts, datos, slackUserId);
    }
  } catch (err) {
    console.error("Error asignando el reporte:", err);
    return NextResponse.json({
      response_type: "ephemeral",
      replace_original: false,
      text: "No se pudo asignar el reporte. Inténtalo de nuevo.",
    });
  }

  return NextResponse.json({ ok: true });
}
