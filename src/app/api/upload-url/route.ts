import { NextResponse, type NextRequest } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { emailPermitido } from "@/lib/domains";
import { esProductoValido } from "@/lib/productos-db";
import {
  tipoPorNombre,
  saneaNombreArchivo,
  MAX_ADJUNTOS,
  MAX_BYTES_ADJUNTO,
} from "@/lib/report";

const BUCKET = "adjuntos";

// Emite URLs de subida firmadas para que el navegador suba los adjuntos directo a Storage
// (esquiva el límite de tamaño de las funciones) sin abrir el bucket a cualquiera.
export async function POST(request: NextRequest) {
  let body: {
    repo?: string;
    email?: string;
    archivos?: { nombre: string; tamano: number }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  // Gate por dominio (el correo lo declara el cliente; no hay login).
  if (!emailPermitido(body.email)) {
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
    urls.push({ nombre, tipo: tipoPorNombre(nombre), path: data.path, token: data.token });
  }

  return NextResponse.json({ urls });
}
