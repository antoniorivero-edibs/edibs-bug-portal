import { NextResponse, type NextRequest } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { emailPermitido } from "@/lib/domains";
import { autenticarLlamada } from "@/lib/api-auth";
import { esProductoValido } from "@/lib/productos-db";
import {
  tipoPorNombre,
  saneaNombreArchivo,
  MAX_ADJUNTOS,
  MAX_BYTES_ADJUNTO,
} from "@/lib/report";

const BUCKET = "adjuntos";

// Emite URLs de subida firmadas para que quien reporta suba los adjuntos directo a Storage
// (esquiva el límite de tamaño de las funciones) sin abrir el bucket a cualquiera.
// Dos vías (ver @/lib/api-auth): navegador (campo `email`) o llamada de confianza con
// secreto, que además puede mandar la identidad en `reporter`.
export async function POST(request: NextRequest) {
  // Con cabecera inválida (o sin secreto configurado) no se sigue.
  const auth = autenticarLlamada(request);
  if (auth.tipo === "rechazada") {
    return NextResponse.json({ error: "Secreto no válido." }, { status: 401 });
  }
  const esConfianza = auth.tipo === "confianza";

  let body: {
    repo?: string;
    email?: string;
    archivos?: { nombre: string; tamano: number }[];
    reporter?: { nombre?: string; email?: string };
    origen_app?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  // El dominio se valida en las dos vías (defensa en profundidad): en la de confianza
  // el correo puede venir en `reporter`, en la web sigue llegando en `email`.
  const email = esConfianza ? (body.reporter?.email ?? body.email) : body.email;
  if (!emailPermitido(email)) {
    return NextResponse.json({ error: "Correo no permitido." }, { status: 403 });
  }

  const repo = (body.repo ?? "").trim();
  const producto = await esProductoValido(repo);
  if (!producto) {
    return NextResponse.json({ error: "Producto no válido." }, { status: 400 });
  }

  const archivos = Array.isArray(body.archivos) ? body.archivos : [];
  if (archivos.length === 0) {
    return NextResponse.json({ urls: [] });
  }
  if (archivos.length > MAX_ADJUNTOS) {
    return NextResponse.json({ error: `Máximo ${MAX_ADJUNTOS} archivos.` }, { status: 400 });
  }

  for (const a of archivos) {
    if (!tipoPorNombre(a?.nombre)) {
      return NextResponse.json({ error: `Tipo no permitido: ${a?.nombre}` }, { status: 400 });
    }
    if (typeof a.tamano === "number" && a.tamano > MAX_BYTES_ADJUNTO) {
      return NextResponse.json({ error: `"${a.nombre}" supera los 50 MB.` }, { status: 400 });
    }
  }

  const admin = crearClienteAdmin();
  const marca = Date.now();
  const urls = [];

  for (let i = 0; i < archivos.length; i++) {
    const nombre = archivos[i].nombre;
    const ext = nombre.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${repo}/${marca}-${i}-${saneaNombreArchivo(nombre)}.${ext}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      return NextResponse.json({ error: "No se pudo preparar la subida." }, { status: 502 });
    }
    // `path` y `token` los usa el navegador del portal con su propio cliente de
    // Supabase (uploadToSignedUrl). Los llamantes externos (otra app, otro
    // proyecto de Supabase) no pueden usarlos, asi que devolvemos ademas las
    // URLs absolutas: `signedUrl` para subir con un PUT plano y `publicUrl`
    // para referenciar el adjunto ya subido.
    const { data: publica } = admin.storage.from(BUCKET).getPublicUrl(path);
    urls.push({
      nombre,
      tipo: tipoPorNombre(nombre),
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publica.publicUrl,
    });
  }

  return NextResponse.json({ urls });
}
