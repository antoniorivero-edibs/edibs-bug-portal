"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import {
  MAX_ADJUNTOS,
  MAX_BYTES_ADJUNTO,
  tipoPorNombre,
  type Adjunto,
} from "@/lib/report";

const BUCKET = "adjuntos";

type Estado = "idle" | "subiendo" | "enviando" | "ok" | "error";

export default function FormularioReporte({
  repo,
  nombreProducto,
}: {
  repo: string;
  nombreProducto: string;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState("");
  const [urlIssue, setUrlIssue] = useState("");

  function onSeleccionArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const seleccion = Array.from(e.target.files ?? []);

    if (seleccion.length + archivos.length > MAX_ADJUNTOS) {
      setError(`Máximo ${MAX_ADJUNTOS} archivos.`);
      return;
    }

    for (const f of seleccion) {
      if (!tipoPorNombre(f.name)) {
        setError(`Tipo no permitido: ${f.name}. Usa png/jpg/webp/gif o mp4/mov/webm.`);
        return;
      }
      if (f.size > MAX_BYTES_ADJUNTO) {
        setError(`"${f.name}" supera los 50 MB.`);
        return;
      }
    }
    setArchivos((prev) => [...prev, ...seleccion]);
  }

  function quitarArchivo(idx: number) {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  }

  // Sube los archivos directamente a Supabase Storage (evita el límite de body de las funciones).
  async function subirAdjuntos(): Promise<Adjunto[]> {
    const supabase = crearClienteNavegador();
    const adjuntos: Adjunto[] = [];

    for (const file of archivos) {
      const tipo = tipoPorNombre(file.name)!;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      // Ruta única: repo + marca de tiempo + índice + nombre saneado.
      const ruta = `${repo}/${Date.now()}-${adjuntos.length}-${sanear(file.name)}.${ext}`;
      const { error: errSubida } = await supabase.storage
        .from(BUCKET)
        .upload(ruta, file, { cacheControl: "3600", upsert: false });

      if (errSubida) {
        throw new Error(`No se pudo subir ${file.name}: ${errSubida.message}`);
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
      adjuntos.push({ nombre: file.name, url: data.publicUrl, tipo, tamano: file.size });
    }
    return adjuntos;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (titulo.trim().length < 3) {
      setError("El título es demasiado corto.");
      return;
    }
    if (descripcion.trim().length < 10) {
      setError("Describe un poco más el problema (mínimo 10 caracteres).");
      return;
    }

    try {
      setEstado("subiendo");
      const adjuntos = archivos.length ? await subirAdjuntos() : [];

      setEstado("enviando");
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo,
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          adjuntos,
          urlOrigen: window.location.href,
        }),
      });

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => ({}));
        throw new Error(cuerpo.error ?? "No se pudo crear el reporte.");
      }

      const data = await res.json();
      setUrlIssue(data.urlIssue);
      setEstado("ok");
    } catch (err) {
      setEstado("error");
      setError(err instanceof Error ? err.message : "Error inesperado.");
    }
  }

  if (estado === "ok") {
    return (
      <div className="mt-6 rounded-[var(--radius-card)] border border-green-300 bg-green-50 p-5 text-sm">
        <p className="font-semibold text-green-800">Reporte enviado. ¡Gracias!</p>
        <p className="mt-1 text-[var(--color-texto-muted)]">
          Se creó el issue en {nombreProducto} y se avisó en Slack.
        </p>
        {urlIssue && (
          <a
            href={urlIssue}
            target="_blank"
            className="mt-2 inline-block font-medium text-[var(--color-action)] underline"
          >
            Ver el issue en GitHub
          </a>
        )}
      </div>
    );
  }

  const ocupado = estado === "subiendo" || estado === "enviando";
  const inputBase =
    "w-full rounded-[var(--radius-sm)] border border-[var(--color-borde)] bg-white px-3 py-2 text-sm text-[var(--color-texto)] outline-none transition-colors focus:border-[var(--color-action)]";

  return (
    <form onSubmit={enviar} className="mt-6 space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-[var(--color-navy)]">Título</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Resumen corto del bug"
          className={inputBase}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-[var(--color-navy)]">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={6}
          placeholder="Qué pasa, qué esperabas, pasos para reproducirlo..."
          className={inputBase}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-[var(--color-navy)]">
          Adjuntos{" "}
          <span className="font-normal text-[var(--color-texto-muted)]">
            (opcional, máx {MAX_ADJUNTOS})
          </span>
        </label>
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
          onChange={onSeleccionArchivos}
          className="block w-full text-sm text-[var(--color-texto-muted)] file:mr-3 file:rounded-[var(--radius-pill)] file:border-0 file:bg-[var(--color-surface-strong)] file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-navy)]"
        />
        {archivos.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {archivos.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-borde)] bg-[var(--color-surface-soft)] px-3 py-1.5"
              >
                <span className="truncate text-[var(--color-texto-body)]">{f.name}</span>
                <button
                  type="button"
                  onClick={() => quitarArchivo(i)}
                  className="ml-2 text-[var(--color-texto-muted)] hover:text-red-600"
                >
                  quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={ocupado}
        className="rounded-[var(--radius-pill)] bg-[var(--color-action)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-action-hover)] disabled:opacity-60"
      >
        {estado === "subiendo"
          ? "Subiendo adjuntos..."
          : estado === "enviando"
            ? "Creando issue..."
            : "Reportar"}
      </button>
    </form>
  );
}

// Limpia el nombre de fichero para usarlo en la ruta de Storage.
function sanear(nombre: string): string {
  const base = nombre.replace(/\.[^.]+$/, "");
  return base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
