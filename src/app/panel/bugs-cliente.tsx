"use client";

import { useState } from "react";

type Adjunto = { nombre: string; url: string; tipo: "imagen" | "video" };

export type BugPanel = {
  repo: string;
  issue_number: number;
  titulo: string;
  estado: string;
  reporter_email: string;
  issue_url: string;
  descripcion: string | null;
  adjuntos: Adjunto[];
  navegador: string | null;
  url_origen: string | null;
  slack_permalink: string | null;
  ia_triaje: boolean;
  ia_investigacion: boolean;
  ia_triaje_url: string | null;
  ia_investigacion_url: string | null;
  creado_en: string;
};

function EstadoBadge({ estado }: { estado: string }) {
  const cerrado = estado === "cerrado";
  return (
    <span
      className={
        cerrado
          ? "rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
          : "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
      }
    >
      {estado}
    </span>
  );
}

function fechaHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function BugsCliente({ bugs, iaOn }: { bugs: BugPanel[]; iaOn: boolean }) {
  const [detalle, setDetalle] = useState<BugPanel | null>(null);

  const th = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-white/80";
  const td = "px-3 py-2.5 align-middle";
  const iaTxt = (ok: boolean) => (ok ? "✓" : iaOn ? "pendiente" : "off");

  if (bugs.length === 0) {
    return <p className="text-sm text-[var(--color-texto-muted)]">Aún no hay bugs reportados.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-borde)] shadow-[var(--edibs-shadow)]">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--color-navy-deep)]">
          <tr>
            <th className={th}>Estado</th>
            <th className={th}>Producto</th>
            <th className={th}>Título</th>
            <th className={th}>Reporta</th>
            <th className={th}>Fecha</th>
            <th className={th}>Slack</th>
            <th className={th}>IA</th>
            <th className={th}>Issue</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((b) => (
            <tr
              key={`${b.repo}#${b.issue_number}`}
              className="border-t border-[var(--color-borde)] bg-white hover:bg-[var(--color-surface-soft)]"
            >
              <td className={td}>
                <EstadoBadge estado={b.estado} />
              </td>
              <td className={`${td} font-mono text-xs`}>{b.repo}</td>
              <td className={`${td} max-w-xs`}>
                <span className="line-clamp-2 text-[var(--color-texto)]">{b.titulo}</span>
              </td>
              <td className={`${td} text-xs text-[var(--color-texto-muted)]`}>{b.reporter_email}</td>
              <td className={`${td} whitespace-nowrap text-xs text-[var(--color-texto-muted)]`}>
                {b.creado_en.slice(0, 10)}
              </td>
              <td className={`${td} whitespace-nowrap text-xs`}>
                {b.slack_permalink ? (
                  <a href={b.slack_permalink} target="_blank" className="text-[var(--color-action)] hover:underline">
                    enviado ↗
                  </a>
                ) : (
                  <span className="text-[var(--color-texto-muted)]">—</span>
                )}
              </td>
              <td className={`${td} whitespace-nowrap text-xs`}>
                {b.ia_triaje_url ? (
                  <a href={b.ia_triaje_url} target="_blank" className="text-[var(--color-action)] hover:underline">
                    triaje ↗
                  </a>
                ) : (
                  <span className="text-[var(--color-texto-muted)]">triaje {iaTxt(b.ia_triaje)}</span>
                )}
                {" · "}
                {b.ia_investigacion_url ? (
                  <a href={b.ia_investigacion_url} target="_blank" className="text-[var(--color-action)] hover:underline">
                    inv. ↗
                  </a>
                ) : (
                  <span className="text-[var(--color-texto-muted)]">inv. {iaTxt(b.ia_investigacion)}</span>
                )}
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <a href={b.issue_url} target="_blank" className="text-[var(--color-action)] hover:underline">
                  #{b.issue_number} ↗
                </a>
              </td>
              <td className={`${td} whitespace-nowrap text-right`}>
                <button
                  onClick={() => setDetalle(b)}
                  className="rounded-[var(--radius-pill)] border border-[var(--color-borde)] px-3 py-1 text-xs font-medium text-[var(--color-navy)] hover:border-[var(--color-action)] hover:bg-white"
                >
                  Ver todo
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {detalle && <DetalleBug bug={detalle} onCerrar={() => setDetalle(null)} />}
    </div>
  );
}

function DetalleBug({ bug, onCerrar }: { bug: BugPanel; onCerrar: () => void }) {
  const imagenes = bug.adjuntos.filter((a) => a.tipo === "imagen");
  const videos = bug.adjuntos.filter((a) => a.tipo === "video");
  const Dato = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="flex gap-2 text-sm">
      <span className="w-28 shrink-0 text-[var(--color-texto-muted)]">{k}</span>
      <span className="min-w-0 break-words text-[var(--color-texto)]">{children}</span>
    </div>
  );

  return (
    <div
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-8 w-full max-w-2xl rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--edibs-shadow)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <EstadoBadge estado={bug.estado} />
              <span className="font-mono text-xs text-[var(--color-texto-muted)]">{bug.repo}</span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-[var(--color-navy)]">{bug.titulo}</h3>
          </div>
          <button
            onClick={onCerrar}
            className="shrink-0 rounded-full border border-[var(--color-borde)] px-2 text-[var(--color-texto-muted)] hover:text-[var(--color-navy)]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-1.5">
          <Dato k="Reporta">{bug.reporter_email}</Dato>
          <Dato k="Fecha y hora">{fechaHora(bug.creado_en)}</Dato>
          <Dato k="Origen">{bug.url_origen || "—"}</Dato>
          <Dato k="Navegador">{bug.navegador || "—"}</Dato>
        </div>

        <h4 className="mt-5 text-sm font-semibold text-[var(--color-navy)]">Descripción</h4>
        <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-texto-body)]">
          {bug.descripcion || "—"}
        </p>

        {imagenes.length > 0 && (
          <>
            <h4 className="mt-5 text-sm font-semibold text-[var(--color-navy)]">Imágenes</h4>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {imagenes.map((a) => (
                <a key={a.url} href={a.url} target="_blank">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url}
                    alt={a.nombre}
                    className="max-h-48 w-full rounded-[var(--radius-sm)] border border-[var(--color-borde)] object-cover"
                  />
                </a>
              ))}
            </div>
          </>
        )}

        {videos.length > 0 && (
          <>
            <h4 className="mt-5 text-sm font-semibold text-[var(--color-navy)]">Vídeos</h4>
            <ul className="mt-1 space-y-1 text-sm">
              {videos.map((a) => (
                <li key={a.url}>
                  <a href={a.url} target="_blank" className="text-[var(--color-action)] underline">
                    {a.nombre}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}

        <h4 className="mt-5 text-sm font-semibold text-[var(--color-navy)]">Enlaces</h4>
        <div className="mt-1 flex flex-wrap gap-2 text-sm">
          <a href={bug.issue_url} target="_blank" className="rounded-[var(--radius-pill)] bg-[var(--color-surface-strong)] px-3 py-1 font-medium text-[var(--color-navy)] hover:bg-[var(--color-action)] hover:text-white">
            Issue #{bug.issue_number} ↗
          </a>
          {bug.slack_permalink && (
            <a href={bug.slack_permalink} target="_blank" className="rounded-[var(--radius-pill)] bg-[var(--color-surface-strong)] px-3 py-1 font-medium text-[var(--color-navy)] hover:bg-[var(--color-action)] hover:text-white">
              Mensaje de Slack ↗
            </a>
          )}
          {bug.ia_triaje_url && (
            <a href={bug.ia_triaje_url} target="_blank" className="rounded-[var(--radius-pill)] bg-[var(--color-surface-strong)] px-3 py-1 font-medium text-[var(--color-navy)] hover:bg-[var(--color-action)] hover:text-white">
              Comentario triaje IA ↗
            </a>
          )}
          {bug.ia_investigacion_url && (
            <a href={bug.ia_investigacion_url} target="_blank" className="rounded-[var(--radius-pill)] bg-[var(--color-surface-strong)] px-3 py-1 font-medium text-[var(--color-navy)] hover:bg-[var(--color-action)] hover:text-white">
              Comentario investigación IA ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
