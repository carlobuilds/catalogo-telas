"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { ColorSwatch } from "@/components/ColorSwatch";
import {
  type Filtros as EstadoFiltros,
  type FacetaLista,
  FILTROS_VACIOS,
  alternar,
  aQuerystring,
  cuentaFiltros,
} from "@/lib/filtros";
import {
  type Catalogo,
  CATALOGOS,
  ORDEN_CATALOGOS,
  rutaDeCatalogo,
  seccionDeCategoria,
  seccionPorSlug,
} from "@/lib/catalogos";
import type { Facetas } from "@/lib/queries";
import { useScrollCompacto } from "@/lib/useScrollCompacto";

interface CatalogToolbarProps {
  catalogo: Catalogo;
  filtros: EstadoFiltros;
  facetas: Facetas;
}

/** Clases de un chip de la barra; el activo es el único púrpura (color de acción). */
function claseChip(activo: boolean, grande = false): string {
  return `inline-flex shrink-0 snap-start items-center justify-center gap-1.5 whitespace-nowrap rounded transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy ${
    grande ? "min-h-[44px] px-4 text-sm font-bold" : "min-h-[40px] px-3.5 text-xs font-semibold sm:text-sm"
  } ${
    activo
      ? "bg-heritage-navy text-white shadow-xs"
      : "border border-outline-variant/30 bg-surface-container-lowest/80 text-ink-text hover:bg-surface-container hover:border-outline shadow-xs"
  }`;
}

function Conteo({ n, activo }: { n: number; activo: boolean }) {
  return <span className={`text-[11px] ${activo ? "text-white/80" : "text-ink-soft"}`}>{n}</span>;
}

export function CatalogToolbar({ catalogo, filtros, facetas }: CatalogToolbarProps) {
  const [panelFiltrosAbierto, setPanelFiltrosAbierto] = useState(false);
  const compacto = useScrollCompacto();
  const filaSecciones = useRef<HTMLDivElement>(null);

  // En móvil la fila de secciones no cabe: si llegan por un link a "Costura",
  // la sección elegida quedaba fuera de vista a la derecha. Se centra el chip
  // activo moviendo SOLO el scroll horizontal de la fila (scrollIntoView
  // también movería la página).
  useEffect(() => {
    const fila = filaSecciones.current;
    const activo = fila?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!fila || !activo) return;
    fila.scrollLeft = activo.offsetLeft - (fila.clientWidth - activo.offsetWidth) / 2;
  }, [filtros.seccion]);

  const activos = cuentaFiltros(filtros);
  const totalFiltrosAvanzados =
    filtros.colores.length +
    filtros.propiedades.length +
    (filtros.soloDisponibles ? 1 : 0);

  const hayAvanzados =
    facetas.colores.length > 0 ||
    facetas.propiedades.length > 0 ||
    facetas.hayStock;

  const base = rutaDeCatalogo(catalogo);
  const ruta = (f: EstadoFiltros) => rutaCon(base, f);
  const href = (faceta: FacetaLista, valor: string) =>
    ruta(alternar(filtros, faceta, valor));

  // Mercería se recorre por SECCIÓN: los chips de categoría salen solo dentro
  // de la sección elegida (con 17 categorías en una fila nadie encontraba
  // nada). Bajo "Todo" solo aparecen las categorías que no tienen sección,
  // para que una categoría nueva nunca quede inalcanzable. Telas, con pocas
  // categorías, conserva su fila de siempre.
  const seccionActiva = catalogo === "merceria" ? seccionPorSlug(filtros.seccion) : null;
  const chipsCategoria =
    catalogo === "telas"
      ? facetas.categorias
      : facetas.categorias.filter((c) =>
          seccionActiva ? seccionActiva.categorias.includes(c.slug) : !seccionDeCategoria(c.slug)
        );
  // Una sección de una sola categoría no necesita un chip que repita lo mismo.
  const mostrarChipsCategoria =
    catalogo === "telas" ? chipsCategoria.length > 0 : chipsCategoria.length > 1 || (!seccionActiva && chipsCategoria.length > 0);
  // Al cambiar de catálogo se conserva solo lo que se estaba buscando.
  const soloBusqueda = { ...FILTROS_VACIOS, q: filtros.q };

  return (
    <div
      id="catalogo-seccion"
      className={`sticky z-30 w-full border-b border-line/60 bg-sand-bg/90 pb-2.5 pt-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all sm:top-16 sm:pb-3 sm:pt-3 ${
        compacto ? "top-12" : "top-16"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Fila 0: Mercería | Telas. Son dos catálogos, no un filtro: ninguno
            muestra productos del otro. En móvil se esconde al hacer scroll,
            igual que los chips; arriba siempre está a un toque. Desde md los
            links del header ya hacen este trabajo: repetirlo aquí pintaba el
            mismo estado de púrpura tres veces. */}
        <nav
          aria-label="Catálogo"
          className={`overflow-hidden transition-all sm:mb-2 sm:max-h-none sm:overflow-visible sm:opacity-100 md:hidden ${
            compacto ? "mb-0 max-h-0 opacity-0" : "mb-2 max-h-16 opacity-100"
          }`}
        >
          <div className="flex w-full gap-1 rounded border border-outline-variant/40 bg-surface-container-lowest/90 p-1 shadow-xs sm:w-auto">
            {ORDEN_CATALOGOS.map((c) => {
              const activo = c === catalogo;
              return (
                <Link
                  key={c}
                  href={rutaCon(rutaDeCatalogo(c), soloBusqueda)}
                  aria-current={activo ? "page" : undefined}
                  className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded px-5 text-sm font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy sm:flex-none ${
                    activo
                      ? "bg-heritage-navy text-white shadow-xs"
                      : "text-ink-display hover:bg-surface-container"
                  }`}
                >
                  {CATALOGOS[c].nombre}
                  <Conteo n={facetas.porCatalogo[c]} activo={activo} />
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Fila 1: Barra de Búsqueda + Botón de Filtros Detallados + Limpiar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <Suspense
              fallback={
                <div className="h-11 w-full animate-pulse rounded bg-surface-container" />
              }
            >
              <SearchBar />
            </Suspense>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botón Filtros Detallados */}
            {hayAvanzados && (
              <button
                type="button"
                onClick={() => setPanelFiltrosAbierto((prev) => !prev)}
                aria-expanded={panelFiltrosAbierto}
                className={`inline-flex h-11 items-center gap-1.5 sm:gap-2 rounded border px-3 sm:px-4 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy ${
                  panelFiltrosAbierto || totalFiltrosAvanzados > 0
                    ? "border-heritage-navy bg-heritage-navy text-white shadow-xs"
                    : "border-outline-variant/40 bg-surface-container-lowest/90 text-ink-display hover:bg-surface-container shadow-xs"
                }`}
                title="Filtros avanzados por color y acabado"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {panelFiltrosAbierto ? "close" : "tune"}
                </span>
                <span className="hidden sm:inline">Filtros</span>
                {totalFiltrosAvanzados > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1.5 text-[10px] font-bold text-white">
                    {totalFiltrosAvanzados}
                  </span>
                )}
              </button>
            )}

            {/* Limpiar Filtros si hay algo activo */}
            {(activos > 0 || filtros.q) && (
              <Link
                href={base}
                scroll={false}
                className="inline-flex h-11 items-center gap-1.5 rounded border border-amber/40 bg-surface-container-lowest/80 px-3 text-xs font-bold text-amber shadow-xs transition-all hover:bg-surface-container hover:border-amber active:scale-95"
                title="Limpiar búsqueda y filtros"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Limpiar</span>
              </Link>
            )}
          </div>
        </div>

        {/* Fila 2 (solo Mercería): secciones. "Cristalería" y "Pedrería" van
            aparte porque así las busca la clientela. Elegir una sección borra
            los chips de categoría: cada sección tiene los suyos. */}
        {catalogo === "merceria" && facetas.secciones.length > 0 && (
          <div
            className={`relative mt-2 overflow-hidden transition-all sm:max-h-none sm:opacity-100 ${
              compacto ? "max-h-0 opacity-0" : "max-h-16 opacity-100"
            }`}
          >
            <h2 className="sr-only">Secciones de mercería</h2>
            <div
              ref={filaSecciones}
              className="relative -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0 no-scrollbar"
            >
              <Link
                href={ruta({ ...filtros, seccion: null, categorias: [] })}
                scroll={false}
                aria-current={!seccionActiva ? "true" : undefined}
                className={claseChip(!seccionActiva, true)}
              >
                Todo
                <Conteo n={facetas.porCatalogo.merceria} activo={!seccionActiva} />
              </Link>
              {facetas.secciones.map((s) => {
                const activo = seccionActiva?.slug === s.slug;
                return (
                  <Link
                    key={s.slug}
                    href={ruta({ ...filtros, seccion: s.slug, categorias: [] })}
                    scroll={false}
                    aria-current={activo ? "true" : undefined}
                    className={claseChip(activo, true)}
                  >
                    {s.nombre}
                    <Conteo n={s.conteo} activo={activo} />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Fila 3: Carrusel Horizontal de Categorías. Es lo primero que se
            oculta al hacer scroll en móvil (`compacto`): entre esto y la
            cabecera se comían casi un tercio de la pantalla, sin dejar
            espacio a las fotos. En sm+ siempre visible, hay espacio de
            sobra. */}
        {mostrarChipsCategoria && (
          <div
            className={`relative mt-2 overflow-hidden transition-all sm:max-h-none sm:opacity-100 ${
              compacto ? "max-h-0 opacity-0" : "max-h-16 opacity-100"
            }`}
          >
            <h2 className="sr-only">Categorías</h2>
            <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0 no-scrollbar">
              {/* Chip "Todos": en Mercería ese papel lo hace la sección. */}
              {catalogo === "telas" && (
                <Link
                  href={ruta({ ...filtros, categorias: [] })}
                  scroll={false}
                  aria-current={filtros.categorias.length === 0 ? "true" : undefined}
                  className={claseChip(filtros.categorias.length === 0)}
                >
                  Todos
                </Link>
              )}

              {/* Categorías */}
              {chipsCategoria.map((c) => {
                const activo = filtros.categorias.includes(c.slug);
                return (
                  <Link
                    key={c.slug}
                    href={href("categorias", c.slug)}
                    scroll={false}
                    aria-current={activo ? "true" : undefined}
                    className={claseChip(activo)}
                  >
                    <span>{c.nombre}</span>
                    {c.conteo != null && <Conteo n={c.conteo} activo={activo} />}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Panel Desplegable de Filtros Avanzados (Colores, Acabados, Stock).
            Vive dentro de la barra sticky, no en un modal — sin límite de
            alto, si hay muchos colores/acabados el final del panel se salía
            de la pantalla en móvil y esas opciones no se podían tocar. */}
        {panelFiltrosAbierto && hayAvanzados && (
          <div className="mt-3 max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface-container-lowest p-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-amber">
                  tune
                </span>
                <span className="font-display text-sm font-bold text-ink-display">
                  Filtros Avanzados
                </span>
                {totalFiltrosAvanzados > 0 && (
                  <span className="rounded bg-amber px-2 py-0.5 text-[10px] font-bold text-white">
                    {totalFiltrosAvanzados} activos
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPanelFiltrosAbierto(false)}
                className="rounded p-1 text-ink-soft hover:bg-surface-container hover:text-ink-text"
                aria-label="Cerrar panel de filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {facetas.colores.length > 0 && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber">
                  Tonalidades
                </h3>
                <div className="flex flex-wrap gap-2">
                  {facetas.colores.map((c) => {
                    const activo = filtros.colores.includes(c.slug);
                    return (
                      <Link
                        key={c.slug}
                        href={href("colores", c.slug)}
                        scroll={false}
                        aria-current={activo ? "true" : undefined}
                        className={`inline-flex shrink-0 items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                          activo
                            ? "bg-heritage-navy text-white shadow-xs"
                            : "border border-outline-variant/30 bg-surface-container text-ink-text hover:bg-surface-container-high"
                        }`}
                      >
                        <ColorSwatch hex={c.hex ?? null} nombre={c.nombre} size="sm" />
                        <span>{c.nombre}</span>
                        {c.conteo != null && (
                          <span
                            className={`text-[10px] ${
                              activo ? "text-white/80" : "text-ink-soft"
                            }`}
                          >
                            {c.conteo}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {facetas.propiedades.length > 0 && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber">
                  Acabado y Textura
                </h3>
                <div className="flex flex-wrap gap-2">
                  {facetas.propiedades.map((p) => {
                    const activo = filtros.propiedades.includes(p.clave as never);
                    return (
                      <Link
                        key={p.clave}
                        href={href("propiedades", p.clave)}
                        scroll={false}
                        aria-current={activo ? "true" : undefined}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                          activo
                            ? "bg-heritage-navy text-white shadow-xs"
                            : "border border-outline-variant/30 bg-surface-container text-ink-text hover:bg-surface-container-high"
                        }`}
                      >
                        <span>{p.etiqueta}</span>
                        {p.conteo != null && (
                          <span
                            className={`text-[10px] ${
                              activo ? "text-white/80" : "text-ink-soft"
                            }`}
                          >
                            {p.conteo}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {facetas.hayStock && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber">
                  Disponibilidad
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={ruta({
                      ...filtros,
                      soloDisponibles: !filtros.soloDisponibles,
                    })}
                    scroll={false}
                    aria-current={filtros.soloDisponibles ? "true" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                      filtros.soloDisponibles
                        ? "bg-heritage-navy text-white shadow-xs"
                        : "border border-outline-variant/30 bg-surface-container text-ink-text hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      check_circle
                    </span>
                    <span>Solo con existencia inmediata</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Filtros → link dentro de un catálogo, sin `?` colgando cuando no hay nada. */
function rutaCon(base: string, f: EstadoFiltros): string {
  const qs = aQuerystring(f);
  return qs ? `${base}?${qs}` : base;
}
