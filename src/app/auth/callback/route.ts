import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { emailPermitido } from "@/lib/auth";

// Callback del magic link: intercambia el código por sesión y valida el dominio.
// Si el email no es de un dominio permitido, se cierra la sesión y se rechaza.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=enlace_invalido`);
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=enlace_invalido`);
  }

  if (!emailPermitido(data.user.email)) {
    // Dominio no autorizado: no dejamos sesión abierta.
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=dominio_no_permitido`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
