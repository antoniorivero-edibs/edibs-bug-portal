"use client";

import { useState } from "react";

// Pestañas simples para el panel. Recibe las etiquetas y los paneles (server-rendered) como hijos.
export default function Tabs({
  etiquetas,
  paneles,
}: {
  etiquetas: string[];
  paneles: React.ReactNode[];
}) {
  const [activa, setActiva] = useState(0);

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-[var(--color-borde)]">
        {etiquetas.map((e, i) => (
          <button
            key={e}
            onClick={() => setActiva(i)}
            className={
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors " +
              (i === activa
                ? "border-[var(--color-action)] text-[var(--color-navy)]"
                : "border-transparent text-[var(--color-texto-muted)] hover:text-[var(--color-navy)]")
            }
          >
            {e}
          </button>
        ))}
      </div>
      {paneles.map((p, i) => (
        <div key={i} hidden={i !== activa}>
          {p}
        </div>
      ))}
    </div>
  );
}
