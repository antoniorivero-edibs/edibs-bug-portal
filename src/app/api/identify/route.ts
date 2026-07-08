import { NextResponse, type NextRequest } from "next/server";
import { emailPermitido } from "@/lib/domains";

// Valida la identidad (nombre + correo) en el servidor, sin revelar los dominios al cliente.
// No se envía nada al correo: solo se comprueba formato y dominio permitido.
export async function POST(request: NextRequest) {
  let body: { nombre?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const nombre = (body.nombre ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();

  if (nombre.length < 2) {
    return NextResponse.json({ error: "Pon tu nombre." }, { status: 400 });
  }
  if (!emailPermitido(email)) {
    return NextResponse.json({ error: "Usa tu correo corporativo." }, { status: 403 });
  }

  return NextResponse.json({ ok: true, nombre, email });
}
