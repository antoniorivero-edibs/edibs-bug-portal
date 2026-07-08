import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Cliente de Supabase para componentes/rutas de servidor.
// Lee y escribe la sesión en las cookies de la request.
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Llamado desde un Server Component: el middleware ya refresca la sesión.
        }
      },
    },
  });
}
