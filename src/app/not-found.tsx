import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mt-10 text-center">
      <h1 className="text-2xl font-bold text-[var(--color-navy)]">No encontrado</h1>
      <p className="mt-2 text-sm text-[var(--color-texto-muted)]">
        Ese producto no existe o ya no es reportable.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block font-medium text-[var(--color-action)] underline"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
