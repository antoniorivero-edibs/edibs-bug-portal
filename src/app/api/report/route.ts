import { NextResponse, type NextRequest, after } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { emailPermitido } from "@/lib/domains";
import { crearIssue, comentarIssue, aplicarLabels } from "@/lib/github";
import { esProductoValido } from "@/lib/productos-db";
import { avisarNuevoBug, buscarSlackPorEmail } from "@/lib/slack";
import { triajeBug, investigarRepo, iaConfigurada } from "@/lib/ai";
import { LABEL_PORTAL } from "@/lib/products";
import {
  construirCuerpoIssue,
  tipoPorNombre,
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
  const cuerpo = construirCuerpoIssue(descripcion, adjuntos, reporter, {
    fecha: new Date().toISOString(),
    navegador: request.headers.get("user-agent") ?? "desconocido",
    urlOrigen: body.urlOrigen ?? "-",
  });

  let issue;
  try {
    issue = await crearIssue({ repo, titulo, cuerpo, asignados: producto.asignados });
  } catch (err) {
    console.error("Error creando issue:", err);
    return NextResponse.json({ error: "No se pudo crear el issue en GitHub." }, { status: 502 });
  }

  // 6. Label base del portal (las de categoría las añade Claude en segundo plano).
  try {
    await aplicarLabels(repo, issue.numero, [LABEL_PORTAL]);
  } catch (err) {
    console.error("Error aplicando la label portal:", err);
  }

  // 7. Avisar en Slack. Si Slack falla no tiramos todo el reporte: el issue ya existe.
  let slack: { channel: string; ts: string } | null = null;
  try {
    // Si Slack está configurado, intenta resolver al reporter por su correo para mencionarlo.
    const reporterSlack = await buscarSlackPorEmail(reporter.email);
    slack = await avisarNuevoBug({
      producto: producto.nombre,
      tituloIssue: titulo,
      urlIssue: issue.url,
      reporter: reporter.nombre,
      reporterEmail: reporter.email,
      reporterSlackId: reporterSlack?.id ?? null,
      devsSlack: producto.devsSlack,
    });
  } catch (err) {
    console.error("Error avisando en Slack:", err);
  }

  // 8. Guardar el mapeo en la tabla reportes (con service role).
  try {
    const admin = crearClienteAdmin();
    await admin.from("reportes").insert({
      repo,
      issue_number: issue.numero,
      issue_url: issue.url,
      titulo,
      reporter_email: reporter.email,
      slack_channel: slack?.channel ?? null,
      slack_ts: slack?.ts ?? null,
    });
  } catch (err) {
    console.error("Error guardando el reporte:", err);
  }

  // 9. Análisis con IA en segundo plano: no bloquea la respuesta al usuario.
  //    Se publican DOS comentarios por orden de importancia, según van terminando:
  //    (1) triaje (resumen + severidad + categoría, aplica labels), (2) investigación del repo.
  if (iaConfigurada()) {
    const numero = issue.numero;
    after(async () => {
      try {
        const triaje = await triajeBug(titulo, descripcion, producto.nombre);
        if (triaje) {
          await comentarIssue(repo, numero, triaje.comentario);
          if (triaje.labels.length) await aplicarLabels(repo, numero, triaje.labels);
        }
      } catch (err) {
        console.error("Error en el comentario de triaje:", err);
      }
      try {
        const investigacion = await investigarRepo(titulo, descripcion, producto.nombre, repo);
        if (investigacion) await comentarIssue(repo, numero, investigacion);
      } catch (err) {
        console.error("Error en el comentario de investigación:", err);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
