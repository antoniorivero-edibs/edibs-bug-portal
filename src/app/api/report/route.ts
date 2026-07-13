import { NextResponse, type NextRequest, after } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { emailPermitido } from "@/lib/domains";
import { crearIssue, comentarIssue, aplicarLabels } from "@/lib/github";
import { esProductoValido } from "@/lib/productos-db";
import { avisarNuevoReporte, buscarSlackPorEmail, responderEnHilo, mdASlack } from "@/lib/slack";
import { triajeBug, investigarRepo, iaConfigurada } from "@/lib/ai";
import { LABEL_PORTAL } from "@/lib/products";
import {
  construirCuerpoIssue,
  tipoPorNombre,
  esTipoReporte,
  MAX_ADJUNTOS,
  MAX_BYTES_ADJUNTO,
  type Adjunto,
} from "@/lib/report";

// Crea el reporte de punta a punta: crea el issue, avisa en Slack y guarda el mapeo
// (repo + issue -> canal + ts) para poder marcarlo resuelto al cerrar.
// Sin login: la identidad (nombre + correo) la declara el cliente y se valida por dominio.
export async function POST(request: NextRequest) {
  // 1. Cuerpo de la petición.
  let body: {
    repo?: string;
    tipo?: string;
    titulo?: string;
    descripcion?: string;
    adjuntos?: Adjunto[];
    reporter?: { nombre?: string; email?: string };
    urlOrigen?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  // Tipo de reporte: bug (por defecto) o sugerencia.
  const tipo = esTipoReporte(body.tipo) ? body.tipo : "bug";
  const esSugerencia = tipo === "sugerencia";

  // 2. Identidad: gate por dominio (no hay sesión).
  const nombreReporter = (body.reporter?.nombre ?? "").trim();
  const emailReporter = (body.reporter?.email ?? "").trim().toLowerCase();
  if (!nombreReporter || !emailPermitido(emailReporter)) {
    return NextResponse.json({ error: "Identifícate con tu correo de EDIBS." }, { status: 403 });
  }
  const reporter = { nombre: nombreReporter, email: emailReporter };

  const repo = (body.repo ?? "").trim();
  const titulo = (body.titulo ?? "").trim();
  const descripcion = (body.descripcion ?? "").trim();
  const adjuntos = Array.isArray(body.adjuntos) ? body.adjuntos : [];

  if (titulo.length < 3 || descripcion.length < 10) {
    return NextResponse.json({ error: "Título o descripción demasiado cortos." }, { status: 400 });
  }

  // 3. El repo tiene que ser un producto válido (topic bug-portal).
  const producto = await esProductoValido(repo);
  if (!producto) {
    return NextResponse.json({ error: "Producto no válido." }, { status: 400 });
  }

  // 4. Revalidación de adjuntos en servidor (no fiarse solo del cliente).
  if (adjuntos.length > MAX_ADJUNTOS) {
    return NextResponse.json({ error: `Máximo ${MAX_ADJUNTOS} adjuntos.` }, { status: 400 });
  }
  for (const a of adjuntos) {
    if (!a?.url || !a?.nombre || !tipoPorNombre(a.nombre)) {
      return NextResponse.json({ error: "Adjunto inválido." }, { status: 400 });
    }
    if (typeof a.tamano === "number" && a.tamano > MAX_BYTES_ADJUNTO) {
      return NextResponse.json({ error: "Adjunto supera los 50 MB." }, { status: 400 });
    }
  }

  // 5. Crear el issue en GitHub.
  //    Bug: asignado a los devs. Sugerencia: sin asignar (se autoasigna con el botón de Slack).
  const navegador = request.headers.get("user-agent") ?? "desconocido";
  const urlOrigen = body.urlOrigen ?? "-";
  const cuerpo = construirCuerpoIssue(
    descripcion,
    adjuntos,
    reporter,
    { fecha: new Date().toISOString(), navegador, urlOrigen },
    tipo
  );

  let issue;
  try {
    issue = await crearIssue({
      repo,
      titulo,
      cuerpo,
      asignados: esSugerencia ? [] : producto.asignados,
      // Issue type de la org: sugerencia -> Feature, bug -> Bug.
      tipoGithub: esSugerencia ? "Feature" : "Bug",
    });
  } catch (err) {
    console.error("Error creando issue:", err);
    return NextResponse.json({ error: "No se pudo crear el issue en GitHub." }, { status: 502 });
  }

  // 6. Label base del portal (igual para bug y sugerencia). El tipo va como issue type,
  //    no como label. Las labels de categoría las añade Claude en el triaje (solo bugs).
  try {
    await aplicarLabels(repo, issue.numero, [LABEL_PORTAL]);
  } catch (err) {
    console.error("Error aplicando las labels:", err);
  }

  // Resolver el usuario de Slack del reporter (si Slack está configurado) para mencionarlo
  // y guardar su ID (enlace a DM en el panel).
  const reporterSlack = await buscarSlackPorEmail(reporter.email);

  // 7. Avisar en Slack. Bug: menciona a los devs. Sugerencia: sin mención. Ambos con botón "Me encargo".
  let slack: { channel: string; ts: string; permalink: string | null } | null = null;
  try {
    slack = await avisarNuevoReporte({
      tipo,
      producto: producto.nombre,
      tituloIssue: titulo,
      urlIssue: issue.url,
      descripcion,
      adjuntos,
      reporter: reporter.nombre,
      reporterEmail: reporter.email,
      reporterSlackId: reporterSlack?.id ?? null,
      repo,
      issueNumber: issue.numero,
      devsSlack: esSugerencia ? [] : producto.devsSlack,
    });
  } catch (err) {
    console.error("Error avisando en Slack:", err);
  }

  // 8. Guardar el mapeo en la tabla reportes (con service role).
  // insert() no lanza: devuelve { error }. Hay que comprobarlo explícitamente.
  try {
    const admin = crearClienteAdmin();
    const { error } = await admin.from("reportes").insert({
      repo,
      issue_number: issue.numero,
      issue_url: issue.url,
      tipo,
      titulo,
      reporter_email: reporter.email,
      reporter_nombre: reporter.nombre,
      reporter_slack_id: reporterSlack?.id ?? null,
      descripcion,
      adjuntos,
      navegador,
      url_origen: urlOrigen,
      slack_channel: slack?.channel ?? null,
      slack_ts: slack?.ts ?? null,
      slack_permalink: slack?.permalink ?? null,
    });
    if (error) console.error("Error guardando el reporte:", error);
  } catch (err) {
    console.error("Error guardando el reporte:", err);
  }

  // 9. Análisis con IA en segundo plano (solo bugs; una sugerencia no se investiga).
  //    Se publican DOS comentarios por orden de importancia, según van terminando:
  //    (1) triaje (resumen + severidad + categoría, aplica labels), (2) investigación del repo.
  if (!esSugerencia && iaConfigurada()) {
    const numero = issue.numero;
    after(async () => {
      const admin = crearClienteAdmin();
      const marcar = async (campo: "ia_triaje" | "ia_investigacion", url: string) => {
        const { error } = await admin
          .from("reportes")
          .update({ [campo]: true, [`${campo}_url`]: url })
          .eq("repo", repo)
          .eq("issue_number", numero);
        if (error) console.error(`Error actualizando ${campo}:`, error);
      };

      try {
        const triaje = await triajeBug(titulo, descripcion, producto.nombre);
        if (triaje) {
          const url = await comentarIssue(repo, numero, triaje.comentario);
          if (triaje.labels.length) await aplicarLabels(repo, numero, triaje.labels);
          await marcar("ia_triaje", url);
          if (slack) await responderEnHilo(slack.channel, slack.ts, mdASlack(triaje.comentario));
        }
      } catch (err) {
        console.error("Error en el comentario de triaje:", err);
      }
      try {
        const investigacion = await investigarRepo(titulo, descripcion, producto.nombre, repo);
        if (investigacion) {
          const url = await comentarIssue(repo, numero, investigacion);
          await marcar("ia_investigacion", url);
          if (slack) await responderEnHilo(slack.channel, slack.ts, mdASlack(investigacion));
        }
      } catch (err) {
        console.error("Error en el comentario de investigación:", err);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
