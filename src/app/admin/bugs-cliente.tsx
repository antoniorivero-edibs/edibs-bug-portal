"use client";

import { useState } from "react";
import { TABLA_WRAP, TABLA, THEAD, TH, TD, TR, BTN_SECUNDARIO, CHIP } from "./ui";

type Adjunto = { nombre: string; url: string; tipo: "imagen" | "video" };

export type BugPanel = {
  repo: string;
  issue_number: number;
  titulo: string;
  estado: string;
  reporter_email: string;
  reporter_nombre: string | null;
  reporter_slack_id: string | null;
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
      className={`${CHIP} ${cerrado ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cerrado ? "bg-purple-500" : "bg-green-500"}`} />
      {estado}
    </span>
  );
}

// Chip de estado de una fase de IA (con enlace al comentario si existe).
function ChipIA({ label, done, url, iaOn }: { label: string; done: boolean; url: string | null; iaOn: boolean }) {
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={`${CHIP} bg-[var(--color-surface-strong)] text-[var(--color-navy)] hover:bg-[var(--color-action)] hover:text-white`}>
        {label} ↗
      </a>
    );
  }
  if (done) return <span className={`${CHIP} bg-green-100 text-green-700`}>{label} ✓</span>;
  if (iaOn) return <span className={`${CHIP} bg-amber-100 text-amber-700`}>{label} ·</span>;
  return <span className={`${CHIP} bg-[var(--color-surface-soft)] text-[var(--color-texto-muted)]`}>{label} off</span>;
}

// Enlace para abrir el DM con el usuario en el Slack de EDIBS (deep link con team).
function enlaceDM(slackId: string): string {
  const team = process.env.NEXT_PUBLIC_SLACK_TEAM_ID;
  return team
    ? `https://slack.com/app_redirect?team=${team}&channel=${slackId}`
    : `https://slack.com/app_redirect?channel=${slackId}`;
}

// Muestra quién reporta: nombre, correo y enlace directo a su DM de Slack (si se conoce).
function Reporter({ bug }: { bug: BugPanel }) {
  return (
    <div className="text-xs">
      {bug.reporter_nombre && (
        <div className="font-medium text-[var(--color-texto)]">{bug.reporter_nombre}</div>
      )}
      <div className="text-[var(--color-texto-muted)]">{bug.reporter_email}</div>
      {bug.reporter_slack_id && (
        <a href={enlaceDM(bug.reporter_slack_id)} target="_blank" rel="noopener noreferrer" className="text-[var(--color-action)] hover:underline">
          Escribir por Slack ↗
        </a>
      )}
    </div>
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

  if (bugs.length === 0) {
    return (
      <div className={`${TABLA_WRAP} p-10 text-center text-sm text-[var(--color-texto-muted)]`}>
        Aún no hay bugs reportados.
      </div>
    );
  }

  return (
    <div className={TABLA_WRAP}>
      <table className={TABLA}>
        <thead className={THEAD}>
          <tr>
            <th className={TH}>Estado</th>
            <th className={TH}>Producto</th>
            <th className={TH}>Título</th>
            <th className={TH}>Reporta</th>
            <th className={TH}>Fecha</th>
            <th className={TH}>Slack</th>
            <th className={TH}>Análisis IA</th>
            <th className={TH}>Issue</th>
            <th className={TH}></th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((b) => (
            <tr key={`${b.repo}#${b.issue_number}`} className={TR}>
              <td className={TD}>
                <EstadoBadge estado={b.estado} />
              </td>
              <td className={`${TD} font-mono text-xs text-[var(--color-texto-muted)]`}>{b.repo}</td>
              <td className={`${TD} max-w-xs`}>
                <span className="line-clamp-2 font-medium text-[var(--color-navy)]">{b.titulo}</span>
              </td>
              <td className={TD}>
                <Reporter bug={b} />
              </td>
              <td className={`${TD} whitespace-nowrap text-xs text-[var(--color-texto-muted)]`}>
                {b.creado_en.slice(0, 10)}
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                {b.slack_permalink ? (
                  <a href={b.slack_permalink} target="_blank" rel="noopener noreferrer" className={`${CHIP} bg-[var(--color-surface-strong)] text-[var(--color-navy)] hover:bg-[var(--color-action)] hover:text-white`}>
                    Slack ↗
                  </a>
                ) : (
                  <span className={`${CHIP} bg-[var(--color-surface-soft)] text-[var(--color-texto-muted)]`}>—</span>
                )}
              </td>
              <td className={TD}>
                <div className="flex flex-wrap gap-1">
                  <ChipIA label="Triaje" done={b.ia_triaje} url={b.ia_triaje_url} iaOn={iaOn} />
                  <ChipIA label="Investigación" done={b.ia_investigacion} url={b.ia_investigacion_url} iaOn={iaOn} />
                </div>
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                <a
                  href={b.issue_url}
                  target="_blank" rel="noopener noreferrer"
                  className={`${CHIP} bg-[var(--color-surface-strong)] text-[var(--color-navy)] hover:bg-[var(--color-action)] hover:text-white`}
                >
                  #{b.issue_number} ↗
                </a>
              </td>
              <td className={`${TD} whitespace-nowrap text-right`}>
                <button onClick={() => setDetalle(b)} className={BTN_SECUNDARIO}>
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
    <div className="flex gap-3 text-sm">
      <span className="w-28 shrink-0 text-[var(--color-texto-muted)]">{k}</span>
      <span className="min-w-0 break-words text-[var(--color-texto)]">{children}</span>
    </div>
  );
  const Enlace = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      target="_blank" rel="noopener noreferrer"
      className="rounded-[var(--radius-pill)] bg-[var(--color-surface-strong)] px-3 py-1 text-sm font-medium text-[var(--color-navy)] transition-colors hover:bg-[var(--color-action)] hover:text-white"
    >
      {children}
    </a>
  );

  return (
    <div onClick={onCerrar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] bg-white shadow-[var(--edibs-shadow)]">
        {/* Cabecera navy */}
        <div className="flex items-start justify-between gap-3 rounded-t-[var(--radius-card)] bg-[var(--color-navy-deep)] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <EstadoBadge estado={bug.estado} />
              <span className="font-mono text-xs text-white/60">{bug.repo}</span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-white">{bug.titulo}</h3>
          </div>
          <button onClick={onCerrar} className="shrink-0 rounded-full px-2 text-white/70 hover:text-white" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-1.5">
            <Dato k="Reporta">
              {bug.reporter_nombre ? `${bug.reporter_nombre} · ` : ""}
              {bug.reporter_email}
              {bug.reporter_slack_id && (
                <>
                  {" · "}
                  <a href={enlaceDM(bug.reporter_slack_id)} target="_blank" rel="noopener noreferrer" className="text-[var(--color-action)] hover:underline">
                    escribir por Slack ↗
                  </a>
                </>
              )}
            </Dato>
            <Dato k="Fecha y hora">{fechaHora(bug.creado_en)}</Dato>
            <Dato k="Origen">{bug.url_origen || "—"}</Dato>
            <Dato k="Navegador">{bug.navegador || "—"}</Dato>
          </div>

          <h4 className="mt-6 text-sm font-semibold text-[var(--color-navy)]">Descripción</h4>
          <p className="mt-1 whitespace-pre-wrap rounded-[var(--radius-sm)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-texto-body)]">
            {bug.descripcion || "—"}
          </p>

          {imagenes.length > 0 && (
            <>
              <h4 className="mt-6 text-sm font-semibold text-[var(--color-navy)]">Imágenes</h4>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {imagenes.map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.nombre} className="max-h-48 w-full rounded-[var(--radius-sm)] border border-[var(--color-borde)] object-cover" />
                  </a>
                ))}
              </div>
            </>
          )}

          {videos.length > 0 && (
            <>
              <h4 className="mt-6 text-sm font-semibold text-[var(--color-navy)]">Vídeos</h4>
              <ul className="mt-1 space-y-1 text-sm">
                {videos.map((a) => (
                  <li key={a.url}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-action)] underline">
                      {a.nombre}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h4 className="mt-6 text-sm font-semibold text-[var(--color-navy)]">Enlaces</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <Enlace href={bug.issue_url}>Issue #{bug.issue_number} ↗</Enlace>
            {bug.slack_permalink && <Enlace href={bug.slack_permalink}>Mensaje de Slack ↗</Enlace>}
            {bug.ia_triaje_url && <Enlace href={bug.ia_triaje_url}>Comentario triaje IA ↗</Enlace>}
            {bug.ia_investigacion_url && <Enlace href={bug.ia_investigacion_url}>Comentario investigación IA ↗</Enlace>}
          </div>
        </div>
      </div>
    </div>
  );
}
