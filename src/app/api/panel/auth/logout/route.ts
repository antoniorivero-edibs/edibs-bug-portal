import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/panel-auth";

// Cierra la sesión del panel.
export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/panel", request.url));
  res.cookies.delete(COOKIE_SESION);
  return res;
}
