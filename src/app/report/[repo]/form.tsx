"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { useReporter } from "@/components/identity-gate";
import {
  MAX_ADJUNTOS,
  MAX_BYTES_ADJUNTO,
  tipoPorNombre,
  type Adjunto,
  type TipoAdjunto,
  type TipoReporte,
} from "@/lib/report";

const BUCKET = "adjuntos";

type Estado = "idle" | "subiendo" | "enviando" | "ok" | "error";

// Textos que cambian entre bug y sugerencia.
const COPY: Record<TipoReporte, {
  tituloPh: string;
  descLabel: string;
  descPh: string;
  boton: string;
  ok: string;
  minDesc: number;
}> = {
  bug: {
    tituloPh: "Resumen corto del bug",
    descLabel: "Descripción",
    descPh: "Qué pasa, qué esperabas, pasos para reproducirlo...",
    boton: "Reportar",
    ok: "Tu reporte se ha registrado correctamente y se ha avisado al equipo. Le echarán un vistazo lo antes posible.",
    minDesc: 10,
  },
  sugerencia: {
    tituloPh: "Resumen corto de la sugerencia",
    descLabel: "¿Qué te gustaría?",
    descPh: "Describe la función, el cambio o la mejora que propones y por qué sería útil...",
    boton: "Enviar sugerencia",
    ok: "Tu sugerencia se ha registrado correctamente. ¡Gracias por la idea!",
    minDesc: 10,
  },
};

export default function FormularioReporte({
  repo,
  nombreProducto,
  tipo,
}: {
  repo: string;
  nombreProducto: string;
  tipo: TipoReporte;
}) {
  const reporter = useReporter();
  const copy = COPY[tipo];
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState("");

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

  // Sube los archivos directo a Storage con URLs firmadas que pide al servidor
  // (evita el límite de body de las funciones y mantiene el bucket cerrado).
  async function subirAdjuntos(): Promise<Adjunto[]> {
    const supabase = crearClienteNavegador();

    // 1. Pide al servidor una URL firmada por archivo (valida dominio, producto y tipos).
    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo,
        email: reporter.email,
        archivos: archivos.map((f) => ({ nombre: f.name, tamano: f.size })),
      }),
    });
    if (!res.ok) {
      const cuerpo = await res.json().catch(() => ({}));
      throw new Error(cuerpo.error ?? "No se pudieron preparar los adjuntos.");
    }
    const { urls } = (await res.json()) as {
      urls: { nombre: string; tipo: TipoAdjunto; path: string; token: string }[];
    };

    // 2. Sube cada archivo con su token firmado y arma la URL pública.
    const adjuntos: Adjunto[] = [];
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      const firma = urls[i];
      const { error: errSubida } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(firma.path, firma.token, file);
      if (errSubida) {
        throw new Error(`No se pudo subir ${file.name}: ${errSubida.message}`);
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(firma.path);
      adjuntos.push({ nombre: file.name, url: data.publicUrl, tipo: firma.tipo, tamano: file.size });
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
    if (descripcion.trim().length < copy.minDesc) {
      setError(`Describe un poco más (mínimo ${copy.minDesc} caracteres).`);
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
          tipo,
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          adjuntos,
          reporter,
          urlOrigen: window.location.href,
        }),
      });

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => ({}));
        throw new Error(cuerpo.error ?? "No se pudo crear el reporte.");
      }

      setEstado("ok");
    } catch (err) {
      setEstado("error");
      setError(err instanceof Error ? err.message : "Error inesperado.");
    }
  }

  if (estado === "ok") {
    return (
      <div className="mt-6 rounded-[var(--radius-card)] border border-green-300 bg-green-50 p-5 text-sm">
        <p className="font-semibold text-green-800">
          ✅ {tipo === "sugerencia" ? "Sugerencia enviada" : "Reporte enviado"}. ¡Gracias!
        </p>
        <p className="mt-1 text-[var(--color-texto-muted)]">
          {tipo === "sugerencia" ? "Sobre" : "Tu reporte de"} {nombreProducto}: {copy.ok}
        </p>
        <button
          onClick={() => {
            setTitulo("");
            setDescripcion("");
            setArchivos([]);
            setEstado("idle");
          }}
          className="mt-3 rounded-[var(--radius-pill)] border border-[var(--color-borde)] px-4 py-1.5 text-xs font-medium text-[var(--color-texto-muted)] transition-colors hover:border-[var(--color-action)] hover:text-[var(--color-navy)]"
        >
          Enviar otra
        </button>
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
          placeholder={copy.tituloPh}
          className={inputBase}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-[var(--color-navy)]">{copy.descLabel}</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={6}
          placeholder={copy.descPh}
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
            ? "Enviando..."
            : copy.boton}
      </button>
    </form>
  );
}
