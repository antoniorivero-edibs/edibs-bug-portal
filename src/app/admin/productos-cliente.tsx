"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TABLA_WRAP, TABLA, THEAD, TH, TD, TR, BTN_PRIMARIO, BTN_SECUNDARIO, INPUT, SECCION } from "./ui";

export type ProductoInicial = {
  repo: string;
  alias: string;
  descripcion: string;
  visible: boolean;
  orden: number;
  ghDescripcion: string;
};

type Config = Record<string, { alias: string; descripcion: string }>;

export default function ProductosCliente({ inicial }: { inicial: ProductoInicial[] }) {
  const router = useRouter();

  const ordenInicialActivos = useMemo(
    () =>
      inicial
        .filter((p) => p.visible)
        .sort((a, b) => a.orden - b.orden || a.repo.localeCompare(b.repo))
        .map((p) => p.repo),
    [inicial]
  );
  const configInicial = useMemo<Config>(() => {
    const c: Config = {};
    for (const p of inicial) c[p.repo] = { alias: p.alias, descripcion: p.descripcion || p.ghDescripcion };
    return c;
  }, [inicial]);
  const snapshotInicial = useMemo(
    () => JSON.stringify({ orden: ordenInicialActivos, config: configInicial }),
    [ordenInicialActivos, configInicial]
  );

  const [activos, setActivos] = useState<string[]>(ordenInicialActivos);
  const [config, setConfig] = useState<Config>(configInicial);
  const [drag, setDrag] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const dirty = JSON.stringify({ orden: activos, config }) !== snapshotInicial;
  const todos = inicial.map((p) => p.repo);
  const inactivos = todos.filter((r) => !activos.includes(r)).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const mostrar = (repo: string) => setActivos((a) => [...a, repo]);
  const ocultar = (repo: string) => setActivos((a) => a.filter((r) => r !== repo));
  const setAlias = (repo: string, alias: string) =>
    setConfig((c) => ({ ...c, [repo]: { ...c[repo], alias } }));
  const setDescripcion = (repo: string, descripcion: string) =>
    setConfig((c) => ({ ...c, [repo]: { ...c[repo], descripcion } }));

  function soltarSobre(target: string) {
    if (!drag || drag === target) return;
    setActivos((a) => {
      const sin = a.filter((r) => r !== drag);
      sin.splice(sin.indexOf(target), 0, drag);
      return sin;
    });
    setDrag(null);
  }

  async function guardar() {
    setGuardando(true);
    try {
      const productos = [
        ...activos.map((repo, i) => ({
          repo,
          alias: config[repo]?.alias ?? "",
          descripcion: config[repo]?.descripcion ?? "",
          visible: true,
          orden: (i + 1) * 10,
        })),
        ...inactivos.map((repo) => ({
          repo,
          alias: config[repo]?.alias ?? "",
          descripcion: config[repo]?.descripcion ?? "",
          visible: false,
          orden: 1000,
        })),
      ];
      const res = await fetch("/api/panel/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productos }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      {/* Barra de guardado */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white px-4 py-3 shadow-[var(--edibs-shadow)]">
        <div className="flex items-center gap-2 text-sm text-[var(--color-texto-muted)]">
          {dirty ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Cambios sin guardar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Todo guardado
            </span>
          )}
          <span className="hidden sm:inline">· arrastra ⠿ para ordenar · descripción con “Editar”</span>
        </div>
        <button onClick={guardar} disabled={!dirty || guardando} className={BTN_PRIMARIO}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {/* Activos */}
      <h3 className={`mb-2 ${SECCION}`}>
        Activos en el portal <span className="text-[var(--color-texto-muted)]">({activos.length})</span>
      </h3>
      <div className={TABLA_WRAP}>
        <table className={TABLA}>
          <thead className={THEAD}>
            <tr>
              <th className={TH} style={{ width: 40 }}></th>
              <th className={TH}>Repo</th>
              <th className={TH}>Alias (nombre visible)</th>
              <th className={TH}>Descripción</th>
              <th className={TH} style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {activos.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-[var(--color-texto-muted)]" colSpan={5}>
                  Ningún producto visible. Actívalo desde “Otros repos”.
                </td>
              </tr>
            )}
            {activos.map((repo) => (
              <tr
                key={repo}
                draggable
                onDragStart={() => setDrag(repo)}
                onDragEnd={() => {
                  setDrag(null);
                  setDragOver(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (drag && drag !== repo) setDragOver(repo);
                }}
                onDragLeave={() => setDragOver((d) => (d === repo ? null : d))}
                onDrop={() => {
                  soltarSobre(repo);
                  setDragOver(null);
                }}
                className={`${TR} cursor-grab active:cursor-grabbing ${drag === repo ? "opacity-40" : ""} ${
                  dragOver === repo ? "shadow-[inset_0_2px_0_0_var(--color-action)]" : ""
                }`}
              >
                <td className={`${TD} text-center text-lg text-[var(--color-texto-muted)]`}>⠿</td>
                <td className={`${TD} font-mono text-xs text-[var(--color-texto-muted)]`}>{repo}</td>
                <td className={TD}>
                  <input
                    value={config[repo]?.alias ?? ""}
                    onChange={(e) => setAlias(repo, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                    placeholder="Alias"
                    className={INPUT}
                  />
                </td>
                <td className={`${TD} max-w-xs`}>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs text-[var(--color-texto-muted)]">
                      {config[repo]?.descripcion || "— sin descripción —"}
                    </span>
                    <button
                      onClick={() => setEditando(repo)}
                      onMouseDown={(e) => e.stopPropagation()}
                      draggable={false}
                      className={`${BTN_SECUNDARIO} shrink-0`}
                    >
                      Editar
                    </button>
                  </div>
                </td>
                <td className={`${TD} text-right`}>
                  <button
                    onClick={() => ocultar(repo)}
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                    className="text-xs font-medium text-[var(--color-texto-muted)] hover:text-red-600"
                  >
                    Ocultar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Otros repos */}
      <h3 className={`mb-2 mt-8 ${SECCION} text-[var(--color-texto-muted)]`}>
        Otros repos disponibles <span>({inactivos.length})</span>
      </h3>
      <div className={TABLA_WRAP}>
        <table className={TABLA}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>Repo</th>
              <th className={TH}>Alias</th>
              <th className={TH}>Descripción</th>
              <th className={TH} style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {inactivos.map((repo) => (
              <tr key={repo} className={TR}>
                <td className={`${TD} font-mono text-xs text-[var(--color-texto-muted)]`}>{repo}</td>
                <td className={TD}>
                  <input value={config[repo]?.alias ?? ""} onChange={(e) => setAlias(repo, e.target.value)} placeholder="Alias" className={INPUT} />
                </td>
                <td className={`${TD} max-w-xs`}>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs text-[var(--color-texto-muted)]">
                      {config[repo]?.descripcion || "— sin descripción —"}
                    </span>
                    <button onClick={() => setEditando(repo)} className={`${BTN_SECUNDARIO} shrink-0`}>
                      Editar
                    </button>
                  </div>
                </td>
                <td className={`${TD} text-right`}>
                  <button
                    onClick={() => mostrar(repo)}
                    className="rounded-[var(--radius-pill)] bg-[var(--color-surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--color-navy)] transition-colors hover:bg-[var(--color-action)] hover:text-white"
                  >
                    Mostrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal descripción */}
      {editando && (
        <div onClick={() => setEditando(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--edibs-shadow)]">
            <h4 className="text-sm font-semibold text-[var(--color-navy)]">
              Descripción · <span className="font-mono text-xs">{editando}</span>
            </h4>
            <p className="mt-1 text-xs text-[var(--color-texto-muted)]">
              Al guardar se aplica y se sincroniza con la descripción del repo en GitHub.
            </p>
            <textarea
              autoFocus
              value={config[editando]?.descripcion ?? ""}
              onChange={(e) => setDescripcion(editando, e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-3 py-2 text-sm outline-none focus:border-[var(--color-action)]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditando(null)} className={BTN_SECUNDARIO} disabled={guardando}>
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await guardar();
                  setEditando(null);
                }}
                disabled={guardando}
                className={BTN_PRIMARIO}
              >
                {guardando ? "Guardando…" : "Guardar descripción"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
