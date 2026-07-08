"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Cliente de Supabase para el navegador (usa la sesión del usuario vía cookies).
export function crearClienteNavegador() {
  return createBrowserClient(env.supabaseUrl(), env.supabaseAnonKey());
}
