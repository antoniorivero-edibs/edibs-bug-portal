import { NextResponse, type NextRequest } from "next/server";
import { loginDesdeCodigo, accesoPermitido, crearSesion, COOKIE_SESION } from "@/lib/panel-auth";

// Callback de GitHub: valida el state, intercambia el código, comprueba que es miembro
// de la org y abre sesión del panel.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const stateCookie = request.cookies.get("edibs-panel-state")?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(`${origin}/panel?error=state`);
  }

  const login = await loginDesdeCodigo(code);
  if (!login) {
    return NextResponse.redirect(`${origin}/panel?error=github`);
  }

  if (!(await accesoPermitido(login))) {
    return NextResponse.redirect(`${origin}/panel?error=no_org`);
  }

  const res = NextResponse.redirect(`${origin}/panel`);
  res.cookies.set(COOKIE_SESION, crearSesion(login), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  res.cookies.delete("edibs-panel-state");
  return res;
}
