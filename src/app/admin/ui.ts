// Clases compartidas del panel para que Productos y Bugs tengan un estilo idéntico y consistente.

export const TABLA_WRAP =
  "overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-borde)] bg-white shadow-[var(--edibs-shadow)]";
export const TABLA = "w-full border-collapse text-sm";
export const THEAD = "bg-[var(--color-navy-deep)]";
export const TH = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/70";
export const TD = "px-4 py-3 align-middle text-[var(--color-texto)]";
export const TR =
  "border-t border-[var(--color-borde)] bg-white transition-colors hover:bg-[var(--color-surface-soft)]";

export const BTN_PRIMARIO =
  "rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-action-hover)] disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_SECUNDARIO =
  "rounded-[var(--radius-pill)] border border-[var(--color-borde)] px-3 py-1 text-xs font-medium text-[var(--color-navy)] transition-colors hover:border-[var(--color-action)] hover:bg-[var(--color-surface-soft)]";

export const INPUT =
  "w-full rounded-[var(--radius-sm)] border border-[var(--color-borde)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-texto)] outline-none transition-colors focus:border-[var(--color-action)]";

export const SECCION = "text-sm font-semibold text-[var(--color-navy)]";
export const CHIP = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium";
