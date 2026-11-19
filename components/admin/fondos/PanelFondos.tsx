import Link from "next/link";
import { LinkSinSalto } from "@/components/LinkSinSalto";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { InterruptorFondoBlanco } from "@/components/admin/fondos/InterruptorFondoBlanco";
import { TarjetaFondo } from "@/components/admin/fondos/TarjetaFondo";
import {
  FILTROS_FONDOS,
  contarPorFiltro,
  filtrarFichas,
  type FichaFondo,
  type FiltroFondos,
} from "@/lib/admin/fondos";

const POR_TANDA = 48;

/** La pantalla sin la lectura de datos: recibe lo que debe pintar. */
export function PanelFondos({
  activo,
  fichas,
  totalFotos,
  filtro,
  hasta,
}: {
  activo: boolean;
  fichas: FichaFondo[];
  totalFotos: number;
  filtro: FiltroFondos;
  hasta: number;
}) {
  const conteo = contarPorFiltro(fichas);
  const visibles = filtrarFichas(fichas, filtro);
  const pagina = visibles.slice(0, hasta);
  const sinMascara = Math.max(0, totalFotos - fichas.length);
  const ruta = (f: FiltroFondos, ver?: number) => {
    const qs = [f !== "todas" ? `filtro=${f}` : null, ver ? `ver=${ver}` : null].filter(Boolean).join("&");
    return qs ? `/admin/fondos?${qs}` : "/admin/fondos";
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <EncabezadoPagina
        titulo="Fondos de foto"
        descripcion="Decide qué fotos salen con fondo blanco en el catálogo. La foto original no se toca y se puede volver a ella cuando quieras."
      />

      <InterruptorFondoBlanco activo={activo} encendidas={conteo.activa} />

      <section className="mb-6 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-base font-semibold text-ink-display">Antes de prenderlo, revisa</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-ink-soft">
          <li>La pedrería plateada se ve más oscura sobre blanco, aunque la foto es la misma.</li>
          <li>En el tul y en las bolsitas queda oscuro lo que se ve a través.</li>
          <li>Las fotos nuevas llegan apagadas hasta que tú las prendas.</li>
          {sinMascara > 0 && (
            <li>
              {sinMascara} fotos no llevan fondo blanco porque ya tienen fondo claro o el producto es
              muy oscuro. Se ven como siempre.
            </li>
          )}
        </ul>
      </section>

      <nav aria-label="Filtrar fotos" className="mb-4 flex flex-wrap gap-2">
        {FILTROS_FONDOS.map((f) => (
          <Link
            key={f.valor}
            href={ruta(f.valor)}
            aria-current={f.valor === filtro ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded border px-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy ${
              f.valor === filtro
                ? "border-heritage-navy bg-heritage-navy text-white"
                : "border-line bg-surface-container-lowest text-ink-display hover:bg-surface-container"
            }`}
          >
            {f.etiqueta}
            <span className="text-sm font-normal tabular-nums">{conteo[f.valor]}</span>
          </Link>
        ))}
      </nav>

      <p className="mb-3 text-base text-ink-soft">
        Las fotos más dudosas salen primero: productos oscuros o transparentes.
      </p>

      {pagina.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface-container-lowest p-6 text-center text-base text-ink-soft">
          No hay fotos en esta vista.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagina.map((ficha) => (
            <TarjetaFondo key={ficha.fotoId} ficha={ficha} />
          ))}
        </div>
      )}

      {visibles.length > pagina.length && (
        <div className="mt-6 flex justify-center">
          <LinkSinSalto
            href={ruta(filtro, hasta + POR_TANDA)}
            className="inline-flex min-h-11 items-center rounded border border-line bg-surface-container-lowest px-5 text-base font-semibold text-ink-display hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
          >
            Ver más ({visibles.length - pagina.length})
          </LinkSinSalto>
        </div>
      )}
    </main>
  );
}

export function leerTandaFondos(valor: string | string[] | undefined): number {
  const n = Number(Array.isArray(valor) ? valor[0] : valor);
  return Number.isFinite(n) && n > POR_TANDA ? Math.min(n, 2000) : POR_TANDA;
}
