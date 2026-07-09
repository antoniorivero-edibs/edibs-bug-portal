"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para el navegador (usa la sesión anónima; se usa para subir adjuntos
// con URL firmada). Las variables NEXT_PUBLIC_* deben leerse con su nombre literal para que
// Next.js las incruste en el bundle del cliente (no vale un helper con índice dinámico).
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
