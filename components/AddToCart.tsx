"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/store";
import type { CatalogoTela } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { unidadDe } from "@/lib/unidades";

export function AddToCart({ variante }: { variante: CatalogoTela }) {
  const unidad = unidadDe(variante.unidad_venta);
  const [cantidad, setCantidad] = useState<number>(unidad.clave === "metro" ? 1 : unidad.minimo);
  const addItem = useCartStore((state) => state.addItem);
  // Cuánto se acaba de agregar (null = nada reciente). Se guarda aparte
  // porque `cantidad` se reinicia en el mismo clic y el aviso diría "1 metro".
  const [agregado, setAgregado] = useState<number | null>(null);
  const agregadoAnim = agregado !== null;

  const agotado = variante.stock === 0;

  const handleAdd = () => {
    if (cantidad > 0) {
      addItem(variante, cantidad);
      setAgregado(cantidad);
      setTimeout(() => setAgregado(null), 1500);
      setCantidad(unidad.clave === "metro" ? 1 : unidad.minimo);
    }
  };

  const etiquetaMenos =
    unidad.clave === "metro" ? "Menos medio metro" : `Menos ${unidad.singular}`;
  const etiquetaMas =
    unidad.clave === "metro" ? "Más medio metro" : `Más ${unidad.singular}`;
  // "1 metro", "1.5 metros", "3 piezas": la unidad concuerda con el número,
  // tanto la que se ve bajo la cantidad como la que anuncia el lector.
  const nombreDe = (n: number) => (n === 1 ? unidad.singular : unidad.plural);
  const nombreUnidad = nombreDe(cantidad);

  return (
    <>
      {/* Aviso para lector de pantalla: el texto del botón cambia a
          "¡Agregado!", pero eso solo se oye si el foco sigue en él. Vive
          FUERA de los dos contenedores porque uno de ellos siempre está en
          `display: none`, y ahí una región viva no anuncia nada. */}
      <p className="sr-only" aria-live="polite">
        {agregado !== null ? `Agregado a la cesta: ${agregado} ${nombreDe(agregado)}` : ""}
      </p>

      {/* Contenedor desktop / flujo normal */}
      <div className="mt-6 hidden flex-col gap-3 sm:flex">
        <div className="flex flex-col gap-3 sm:flex-row items-stretch">
          {/* Stepper */}
          <div className="flex h-14 items-center justify-between gap-1 rounded border border-outline-variant/30 bg-surface-container px-1.5 shadow-inner-xs sm:w-48">
            <button
              type="button"
              disabled={agotado}
              onClick={() => setCantidad((prev) => Math.max(unidad.minimo, prev - unidad.paso))}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-surface-container-lowest text-lg font-bold text-ink-display shadow-xs transition-all hover:bg-surface-container-high active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={etiquetaMenos}
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">remove</span>
            </button>
            <div
              aria-live="polite"
              className="flex min-w-0 flex-1 flex-col items-center justify-center"
            >
              <span className="text-base font-bold leading-none text-ink-display">{cantidad}</span>
              <span className="text-label-caps mt-0.5 text-xs text-amber">
                {nombreUnidad}
              </span>
            </div>
            <button
              type="button"
              disabled={agotado}
              onClick={() => setCantidad((prev) => prev + unidad.paso)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-surface-container-lowest text-lg font-bold text-ink-display shadow-xs transition-all hover:bg-surface-container-high active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={etiquetaMas}
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>

          {/* Botón Principal */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAdd}
            disabled={agotado}
            className="sm:flex-1 h-14"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {agregadoAnim ? "check" : "shopping_bag"}
            </span>
            {agotado ? "Sin existencia" : agregadoAnim ? "¡Agregado a la Cesta!" : "Añadir a la Cesta"}
          </Button>
        </div>
        {agotado && (
          <p className="text-sm text-ink-soft">
            Este color está agotado por ahora — consúltanos por WhatsApp para apartarlo.
          </p>
        )}
      </div>

      {/* Barra flotante en Mobile (Fija en el pie sobre el MobileBottomNav).
          El offset no puede ser un simple `bottom-16`: MobileBottomNav mide
          64px + su propio `pb-safe`, así que en un iPhone con home
          indicator esta barra quedaba encimada en esa franja de safe-area. */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 block border-t border-line/60 bg-sand-bg/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md sm:hidden">
        <div className="flex gap-2.5 items-center">
          <div className="flex h-14 shrink-0 items-center bg-surface-container rounded px-1 border border-outline-variant/30">
            <button
              type="button"
              disabled={agotado}
              onClick={() => setCantidad((prev) => Math.max(unidad.minimo, prev - unidad.paso))}
              className="flex h-11 w-11 items-center justify-center rounded bg-surface-container-lowest text-ink-display active:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:opacity-40"
              aria-label={etiquetaMenos}
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">remove</span>
            </button>
            {/* Número + unidad: antes solo iba el número y "2" no decía si
                eran metros, piezas o bolsas. */}
            <span
              aria-live="polite"
              className="flex min-w-[3.75rem] flex-col items-center justify-center px-1 text-center"
            >
              <span className="text-base font-bold leading-none text-ink-display">{cantidad}</span>
              <span className="text-label-caps mt-0.5 text-xs text-amber">
                {nombreUnidad}
              </span>
            </span>
            <button
              type="button"
              disabled={agotado}
              onClick={() => setCantidad((prev) => prev + unidad.paso)}
              className="flex h-11 w-11 items-center justify-center rounded bg-surface-container-lowest text-ink-display active:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:opacity-40"
              aria-label={etiquetaMas}
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={agotado}
            className="flex h-14 min-w-0 flex-1 items-center justify-center gap-1.5 rounded bg-heritage-navy px-3 text-center text-sm font-bold leading-tight text-white shadow-md transition-transform hover:bg-deep-slate active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px]">
              {agotado ? "block" : agregadoAnim ? "check" : "shopping_bag"}
            </span>
            <span>
              {agotado ? "Sin existencia" : agregadoAnim ? "¡Agregado!" : "Añadir a la Cesta"}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
