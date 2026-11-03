import Link from "next/link";
import { exigirAdmin } from "@/lib/admin-auth";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { GUIAS } from "@/lib/guias";

export const metadata = { title: "Guías de uso — Telas La Jalisciense" };

export default async function PaginaGuias() {
  await exigirAdmin();
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <EncabezadoPagina
        titulo="Guías de uso"
        descripcion="Ábrelas para leerlas o imprimirlas en tamaño carta. Salen bien en blanco y negro."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {GUIAS.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/admin/guias/${g.slug}`}
              className="flex h-full min-h-11 flex-col gap-1 rounded-lg border border-line bg-surface-container-lowest p-4 shadow-sm transition-colors hover:border-heritage-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
            >
              <span className="text-lg font-semibold text-ink-display">{g.titulo}</span>
              <span className="text-sm font-semibold text-amber">{g.paraQuien}</span>
              <span className="text-base text-ink-soft">{g.resumen}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
