"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

// Dominios permitidos (chequeo de UX; el servidor vuelve a validar en el callback).
const DOMINIOS = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || "edibschool.com,indexmediamarketing.com")
  .split(",")
  .map((d) => d.trim().toLowerCase());

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "enviado" | "error">("idle");
  const [mensaje, setMensaje] = useState("");

  function dominioValido(valor: string): boolean {
    const dominio = valor.split("@")[1]?.toLowerCase();
    return !!dominio && DOMINIOS.includes(dominio);
  }

  async function enviarEnlace(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("");

    if (!dominioValido(email)) {
      setEstado("error");
      setMensaje(`Usa tu email corporativo (${DOMINIOS.join(" o ")}).`);
      return;
    }

    setEstado("enviando");
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setEstado("error");
      setMensaje("No se pudo enviar el enlace. Inténtalo de nuevo.");
      return;
    }
    setEstado("enviado");
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
        Te enviamos un enlace de acceso a tu email de EDIBS.
      </p>

      {estado === "enviado" ? (
        <div className="mt-6 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4 text-sm">
          Enlace enviado a <strong>{email}</strong>. Revisa tu correo y pulsa para entrar.
        </div>
      ) : (
        <form onSubmit={enviarEnlace} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu.nombre@edibschool.com"
            className="w-full rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm outline-none focus:border-[var(--color-acento)]"
          />
          <button
            type="submit"
            disabled={estado === "enviando"}
            className="w-full rounded-lg bg-[var(--color-acento)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {estado === "enviando" ? "Enviando..." : "Enviar enlace"}
          </button>
          {mensaje && <p className="text-sm text-red-400">{mensaje}</p>}
        </form>
      )}
    </div>
  );
}
