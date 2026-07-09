"use client";

// Identidad del reporter guardada en el navegador (sin login: solo nombre + correo).
export type Reporter = {
  nombre: string;
  email: string;
};

const CLAVE = "edibs-bug-reporter";

export function leerReporter(): Reporter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (typeof r?.nombre === "string" && typeof r?.email === "string") return r;
    return null;
  } catch {
    return null;
  }
}

export function guardarReporter(reporter: Reporter): void {
  window.localStorage.setItem(CLAVE, JSON.stringify(reporter));
}

export function borrarReporter(): void {
  window.localStorage.removeItem(CLAVE);
}
