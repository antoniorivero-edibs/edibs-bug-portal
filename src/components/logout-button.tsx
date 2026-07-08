"use client";

import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

// Botón de cerrar sesión. Limpia la sesión de Supabase y vuelve al login.
export default function LogoutButton() {
  const router = useRouter();

  async function salir() {
    const supabase = crearClienteNavegador();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={salir}
      className="rounded-[var(--radius-pill)] border border-[var(--color-borde)] px-4 py-1.5 text-xs font-medium text-[var(--color-texto-muted)] transition-colors hover:border-[var(--color-action)] hover:text-[var(--color-navy)]"
    >
      Salir
    </button>
  );
}
