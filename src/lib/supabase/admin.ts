import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Cliente con service role: solo servidor. Salta RLS.
// Se usa para escribir en la tabla `reportes` desde las rutas de servidor.
export function crearClienteAdmin() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
