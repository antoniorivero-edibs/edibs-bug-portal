import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center">
      <h1 className="text-xl font-semibold">No encontrado</h1>
      <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
        Ese producto no existe o ya no es reportable.
      </p>
      <Link href="/" className="mt-4 inline-block text-[var(--color-acento)] underline">
        Volver al inicio
      </Link>
    </div>
  );
}
