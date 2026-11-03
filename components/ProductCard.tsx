import Link from "next/link";
import type { TelaAgrupada } from "@/lib/types";
import { publicImageUrl } from "@/lib/supabase/storage";
import { TelaImage } from "@/components/TelaImage";
import { ColorSwatch } from "@/components/ColorSwatch";
import { AttributeBadges } from "@/components/AttributeBadges";
import { unidadDe } from "@/lib/unidades";

const pesos = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function ProductCard({
  tela,
  priority = false,
}: {
  tela: TelaAgrupada;
  priority?: boolean;
}) {
  const principal = tela.variantes[0];
  const foto = publicImageUrl(principal?.foto_principal);

  const swatches = Array.from(
    new Map(
      tela.variantes
        .filter((v) => v.color_hex)
        .map((v) => [v.color_hex, v])
    ).values()
  );

  // "desde" solo cuando de verdad hay varios precios: con un solo precio
  // la palabra hace pensar que hay algo más barato escondido.
  const preciosDistintos = new Set(
    tela.variantes.map((v) => v.precio_metro).filter((p) => p != null)
  ).size;

  const atributos = {
    es_bordado: tela.variantes.some((v) => v.es_bordado),
    es_brillante: tela.variantes.some((v) => v.es_brillante),
    es_traslucida: tela.variantes.some((v) => v.es_traslucida),
    es_tornasol: tela.variantes.some((v) => v.es_tornasol),
  };

  return (
    <Link
      href={`/tela/${tela.tela_slug}`}
      className="group flex flex-col gap-3 rounded border border-outline-variant/30 bg-surface-container-lowest p-3 sm:p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
    >
      {/* Imagen cuadrada con zoom suave */}
      <div className="relative aspect-square overflow-hidden rounded bg-surface-container-low">
        <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105">
          <TelaImage
            src={foto}
            derivados={principal?.foto_principal_derivados}
            mascara={principal?.foto_principal_mascara}
            alt={principal?.color_nombre ? `${tela.tela_nombre} ${principal.color_nombre}` : tela.tela_nombre}
            priority={priority}
            aspecto="cuadrado"
          />
        </div>
      </div>

      {/* Información del producto */}
      <div className="flex flex-1 flex-col justify-between gap-2">
        <div className="flex flex-col gap-1">
          {tela.categoria && (
            <p className="text-sm font-semibold text-amber">{tela.categoria}</p>
          )}

          <h3 className="font-display text-base font-semibold leading-snug text-ink-display transition-colors group-hover:text-amber sm:text-lg">
            {tela.tela_nombre}
          </h3>
        </div>

        <div className="flex flex-col gap-2 pt-1 border-t border-line/60">
          {tela.precio_desde != null ? (
            <div>
              <p className="text-lg font-bold tabular-nums text-amber sm:text-xl">
                {preciosDistintos > 1 && (
                  <span className="text-sm font-normal text-ink-soft">desde </span>
                )}
                {pesos.format(tela.precio_desde)}
                <span className="ml-0.5 text-sm font-medium text-ink-soft">
                  {unidadDe(tela.precio_desde_unidad).sufijoPrecio}
                </span>
              </p>
              {/* Precio de demo (NEXT_PUBLIC_DEMO_PRICES): se avisa para que
                  nadie cotice con un número que la tienda no decidió. */}
              {tela.precio_desde_es_referencia && (
                <p className="text-sm text-ink-soft">Precio de referencia</p>
              )}
            </div>
          ) : (
            <p className="text-base font-medium text-ink-soft">Precio a consultar</p>
          )}

          {/* Los puntos son una muestra visual, no información que se pueda
              leer uno por uno: el lector de pantalla oiría "Rojo, Azul, …,
              más 4" dentro del nombre del enlace. Se ocultan y se anuncia
              solo cuántos colores hay. */}
          {swatches.length > 0 && (
            <>
              <div aria-hidden className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {swatches.slice(0, 6).map((v) => (
                  <ColorSwatch key={v.color_hex} hex={v.color_hex} nombre={v.color_nombre} size="md" />
                ))}
                {swatches.length > 6 && (
                  <span className="text-sm font-semibold text-ink-soft">+{swatches.length - 6}</span>
                )}
              </div>
              <span className="sr-only">
                {swatches.length === 1 ? "1 color" : `${swatches.length} colores`}
              </span>
            </>
          )}

          <AttributeBadges atributos={atributos} />
        </div>
      </div>
    </Link>
  );
}

