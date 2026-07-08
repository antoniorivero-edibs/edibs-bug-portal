import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { urlAutorizacion } from "@/lib/panel-auth";

// Inicia el login con GitHub: fija un state anti-CSRF y redirige a GitHub.
export async function GET(_request: NextRequest) {
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(urlAutorizacion(state));
  res.cookies.set("edibs-panel-state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
