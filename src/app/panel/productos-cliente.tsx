"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

  // Orden inicial: visibles primero por orden; luego el resto por repo.
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
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const dirty = JSON.stringify({ orden: activos, config }) !== snapshotInicial;

  const todos = inicial.map((p) => p.repo);
  const inactivos = todos.filter((r) => !activos.includes(r)).sort((a, b) => a.localeCompare(b));

  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  function mostrar(repo: string) {
    setActivos((a) => [...a, repo]);
  }
  function ocultar(repo: string) {
    setActivos((a) => a.filter((r) => r !== repo));
  }
  function setAlias(repo: string, alias: string) {
    setConfig((c) => ({ ...c, [repo]: { ...c[repo], alias } }));
  }
  function setDescripcion(repo: string, descripcion: string) {
    setConfig((c) => ({ ...c, [repo]: { ...c[repo], descripcion } }));
  }

  function soltarSobre(target: string) {
    if (!drag || drag === target) return;
    setActivos((a) => {
      const sin = a.filter((r) => r !== drag);
      const idx = sin.indexOf(target);
      sin.splice(idx, 0, drag);
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

  const th = "px-3 py-2 text-left text-xs font-semibold text-[var(--color-texto-muted)]";
  const td = "px-3 py-2 align-middle";
  const inputCls =
    "w-full rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-2 py-1 text-sm outline-none focus:border-[var(--color-action)]";

  return (
    <div>
      {/* Barra de guardado */}
      <div className="mb-4 flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white px-4 py-3">
        <p className="text-sm text-[var(--color-texto-muted)]">
          Arrastra <span className="font-mono">⠿</span> para ordenar los activos. Descripción con el
          botón <em>Editar</em>. {dirty ? (
            <span className="font-medium text-amber-600">· Tienes cambios sin guardar</span>
          ) : (
            <span>· Todo guardado</span>
          )}
        </p>
        <button
          onClick={guardar}
          disabled={!dirty || guardando}
          className="rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-action-hover)] disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* Activos */}
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-navy)]">
        Activos en el portal ({activos.length})
      </h3>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-borde)]">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[var(--color-surface-soft)]">
            <tr>
              <th className={th} style={{ width: 32 }}></th>
              <th className={th}>Repo</th>
              <th className={th}>Alias (nombre visible)</th>
              <th className={th}>Descripción</th>
              <th className={th} style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {activos.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-[var(--color-texto-muted)]" colSpan={5}>
                  Ningún producto visible. Activa uno desde la tabla de abajo.
                </td>
              </tr>
            )}
            {activos.map((repo) => (
              <tr
                key={repo}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => soltarSobre(repo)}
                className="border-t border-[var(--color-borde)] bg-white"
              >
                <td className={td}>
                  <span
                    draggable
                    onDragStart={() => setDrag(repo)}
                    onDragEnd={() => setDrag(null)}
                    className="cursor-grab select-none text-[var(--color-texto-muted)]"
                    title="Arrastra para reordenar"
                  >
                    ⠿
                  </span>
                </td>
                <td className={`${td} font-mono text-xs`}>{repo}</td>
                <td className={td}>
                  <input
                    value={config[repo]?.alias ?? ""}
                    onChange={(e) => setAlias(repo, e.target.value)}
                    placeholder="Alias"
                    className={inputCls}
                  />
                </td>
                <td className={`${td} max-w-xs`}>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs text-[var(--color-texto-muted)]">
                      {config[repo]?.descripcion || "—"}
                    </span>
                    <button
                      onClick={() => setEditando(repo)}
                      className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-2 py-0.5 text-xs hover:border-[var(--color-action)] hover:text-[var(--color-navy)]"
                    >
                      Editar
                    </button>
                  </div>
                </td>
                <td className={`${td} text-right`}>
                  <button
                    onClick={() => ocultar(repo)}
                    className="text-xs text-[var(--color-texto-muted)] hover:text-red-600"
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
      <h3 className="mb-2 mt-6 text-sm font-semibold text-[var(--color-texto-muted)]">
        Otros repos disponibles ({inactivos.length})
      </h3>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-borde)]">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[var(--color-surface-soft)]">
            <tr>
              <th className={th}>Repo</th>
              <th className={th}>Alias</th>
              <th className={th}>Descripción</th>
              <th className={th} style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {inactivos.map((repo) => (
              <tr key={repo} className="border-t border-[var(--color-borde)] bg-white">
                <td className={`${td} font-mono text-xs`}>{repo}</td>
                <td className={td}>
                  <input
                    value={config[repo]?.alias ?? ""}
                    onChange={(e) => setAlias(repo, e.target.value)}
                    placeholder="Alias"
                    className={inputCls}
                  />
                </td>
                <td className={`${td} max-w-xs`}>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs text-[var(--color-texto-muted)]">
                      {config[repo]?.descripcion || "—"}
                    </span>
                    <button
                      onClick={() => setEditando(repo)}
                      className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-2 py-0.5 text-xs hover:border-[var(--color-action)] hover:text-[var(--color-navy)]"
                    >
                      Editar
                    </button>
                  </div>
                </td>
                <td className={`${td} text-right`}>
                  <button
                    onClick={() => mostrar(repo)}
                    className="rounded-[var(--radius-pill)] bg-[var(--color-surface-strong)] px-3 py-1 text-xs font-medium text-[var(--color-navy)] hover:bg-[var(--color-action)] hover:text-white"
                  >
                    Mostrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de descripción */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--edibs-shadow)]">
            <h4 className="text-sm font-semibold text-[var(--color-navy)]">
              Descripción · <span className="font-mono text-xs">{editando}</span>
            </h4>
            <p className="mt-1 text-xs text-[var(--color-texto-muted)]">
              Se sincroniza con la descripción del repo en GitHub al guardar.
            </p>
            <textarea
              autoFocus
              value={config[editando]?.descripcion ?? ""}
              onChange={(e) => setDescripcion(editando, e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-[var(--radius-sm)] border border-[var(--color-borde)] px-3 py-2 text-sm outline-none focus:border-[var(--color-action)]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditando(null)}
                className="rounded-[var(--radius-pill)] border border-[var(--color-borde)] px-4 py-1.5 text-sm text-[var(--color-texto-muted)] hover:text-[var(--color-navy)]"
              >
                Hecho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
