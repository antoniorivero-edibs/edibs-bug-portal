import { NextResponse, type NextRequest } from "next/server";
import { emailPermitido, nombreDesdeEmail } from "@/lib/domains";
import { buscarSlackPorEmail } from "@/lib/slack";

// Valida la identidad (solo correo) en el servidor, sin revelar los dominios al cliente.
// El nombre se resuelve automáticamente: de Slack si está configurado, si no del propio correo.
// No se envía nada al correo: solo se comprueba formato y dominio permitido.
export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!emailPermitido(email)) {
    return NextResponse.json({ error: "Usa tu correo corporativo." }, { status: 403 });
  }

  // Nombre automático: Slack (si hay token) o derivado del correo.
  const slackUser = await buscarSlackPorEmail(email);
  const nombre = slackUser?.nombre || nombreDesdeEmail(email);

  return NextResponse.json({ ok: true, email, nombre });
}
