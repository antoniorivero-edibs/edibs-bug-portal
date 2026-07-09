import { NextResponse, type NextRequest } from "next/server";
import { verify } from "@octokit/webhooks-methods";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { actualizarEstadoBug, responderEnHilo } from "@/lib/slack";
import { aliasDeRepo } from "@/lib/products";
import { env } from "@/lib/env";

// Webhook de la GitHub App. Al cerrar/reabrir un issue actualiza el aviso de Slack.
export async function POST(request: NextRequest) {
  const firma = request.headers.get("x-hub-signature-256");
  const evento = request.headers.get("x-github-event");
  const cuerpoRaw = await request.text();

  // Validar la firma del webhook.
  if (!firma || !(await verify(env.githubWebhookSecret(), cuerpoRaw, firma))) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  // Solo nos interesan los eventos de issues.
  if (evento !== "issues") {
    return NextResponse.json({ ok: true, ignorado: evento });
  }

  const payload = JSON.parse(cuerpoRaw);
  const action: string = payload.action;
  if (action !== "closed" && action !== "reopened") {
    return NextResponse.json({ ok: true, ignorado: action });
  }

  const repo: string = payload.repository?.name;
  const issueNumber: number = payload.issue?.number;
  const issueUrl: string = payload.issue?.html_url;
  const titulo: string = payload.issue?.title;
  if (!repo || !issueNumber) {
    return NextResponse.json({ ok: true, ignorado: "sin_repo_o_issue" });
  }

  // Buscar el mensaje de Slack guardado para este issue.
  const admin = crearClienteAdmin();
  const { data: reporte } = await admin
    .from("reportes")
    .select("slack_channel, slack_ts")
    .eq("repo", repo)
    .eq("issue_number", issueNumber)
    .maybeSingle();

  if (!reporte) {
    // Issue no creado desde el portal: nada que hacer.
    return NextResponse.json({ ok: true, sinReporte: true });
  }

  const resuelto = action === "closed";

  // Reflejar el estado en la tabla siempre (haya Slack o no).
  await admin
    .from("reportes")
    .update({ estado: resuelto ? "cerrado" : "abierto" })
    .eq("repo", repo)
    .eq("issue_number", issueNumber);

  // Actualizar el mensaje de Slack solo si existe (Slack puede no estar configurado todavía).
  if (reporte.slack_channel && reporte.slack_ts) {
    try {
      await actualizarEstadoBug(reporte.slack_channel, reporte.slack_ts, resuelto, {
        producto: aliasDeRepo(repo),
        tituloIssue: titulo,
        urlIssue: issueUrl,
      });
      // Aviso en el hilo de seguimiento.
      await responderEnHilo(
        reporte.slack_channel,
        reporte.slack_ts,
        resuelto ? ":white_check_mark: *Resuelto* (issue cerrado)" : ":arrows_counterclockwise: *Reabierto*"
      );
    } catch (err) {
      console.error("Error actualizando Slack desde webhook:", err);
      return NextResponse.json({ error: "No se pudo actualizar Slack." }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true });
}
