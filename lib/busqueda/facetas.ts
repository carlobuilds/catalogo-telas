/**
 * Facetas: qué chips pintar y con cuántos productos cada uno.
 * ===========================================================================
 * Salen del mismo índice que la búsqueda (lib/busqueda/indice.ts), así que un
 * producto que "también aparece en" otra categoría cuenta en las dos: el chip
 * dice cuántas cards va a ver quien lo pique.
 */
import { PROPIEDADES } from "@/lib/filtros";
import { type Catalogo, SECCIONES_MERCERIA } from "@/lib/catalogos";
import type { ModeloIndice } from "@/lib/busqueda/indice";

export type Faceta = {
  slug: string;
  nombre: string;
  /** Solo colores: para pintar el punto del chip. */
  hex?: string | null;
  /** Cuántos MODELOS (no variantes) caen aquí. */
  conteo: number;
};

/** Lo que se cuenta sobre los modelos de UN catálogo. */
export type FacetasBase = {
  categorias: Faceta[];
  colores: Faceta[];
  propiedades: { clave: string; etiqueta: string; conteo: number }[];
  /** ¿Alguien tiene stock capturado? Si no, el chip de disponibilidad sobra. */
  hayStock: boolean;
};

export type Facetas = FacetasBase & {
  /** Solo Mercería: modelos por sección, en el orden de `SECCIONES_MERCERIA`. */
  secciones: Faceta[];
  /** Modelos de cada catálogo, para el selector Mercería | Telas. */
  porCatalogo: Record<Catalogo, number>;
};

export const FACETAS_VACIAS: Facetas = {
  categorias: [],
  colores: [],
  propiedades: [],
  hayStock: false,
  secciones: [],
  porCatalogo: { merceria: 0, telas: 0 },
};

const porConteoLuegoNombre = (a: Faceta, b: Faceta) =>
  b.conteo - a.conteo || a.nombre.localeCompare(b.nombre, "es");

/**
 * Cuenta MODELOS por faceta, no variantes: la card del grid es un modelo, así
 * que "Flores (5)" tiene que querer decir cinco cards, no cinco fotos.
 */
export function contarFacetas(modelos: ModeloIndice[]): FacetasBase {
  const porCategoria = new Map<string, Faceta>();
  const porColor = new Map<string, Faceta>();
  const porPropiedad = new Map<string, number>();
  let hayStock = false;

  for (const m of modelos) {
    for (const c of m.categorias) {
      const e = porCategoria.get(c.slug) ?? { slug: c.slug, nombre: c.nombre, conteo: 0 };
      e.conteo += 1;
      porCategoria.set(c.slug, e);
    }
    for (const c of m.colores) {
      const e = porColor.get(c.slug) ?? { slug: c.slug, nombre: c.nombre, hex: c.hex, conteo: 0 };
      e.conteo += 1;
      porColor.set(c.slug, e);
    }
    for (const p of PROPIEDADES) {
      if (m.variantes.some((v) => v.propiedades.includes(p.clave))) {
        porPropiedad.set(p.clave, (porPropiedad.get(p.clave) ?? 0) + 1);
      }
    }
    if (m.variantes.some((v) => v.stock != null && v.stock > 0)) hayStock = true;
  }

  return {
    categorias: [...porCategoria.values()].sort(porConteoLuegoNombre),
    colores: [...porColor.values()].sort(porConteoLuegoNombre),
    // Solo las propiedades que alguien tiene: sin esto la portada pinta cuatro
    // chips ("Bordado", "Brillante"…) que no filtran nada porque nadie las
    // capturó. Los chips aparecen solos conforme la tienda llene esos datos.
    propiedades: PROPIEDADES.filter((p) => porPropiedad.has(p.clave)).map((p) => ({
      clave: p.clave,
      etiqueta: p.etiqueta,
      conteo: porPropiedad.get(p.clave)!,
    })),
    hayStock,
  };
}

/**
 * Facetas de UN catálogo: los chips de Telas no ofrecen colores que solo
 * existen en mercería, y el selector sabe cuántos modelos hay del otro lado.
 * Una sección sin productos no se pinta, igual que una categoría vacía.
 */
export function facetasDeIndice(indice: ModeloIndice[], catalogo: Catalogo): Facetas {
  const propios = indice.filter((m) => m.catalogo === catalogo);
  return {
    ...contarFacetas(propios),
    secciones:
      catalogo === "merceria"
        ? SECCIONES_MERCERIA.map((s) => ({
            slug: s.slug,
            nombre: s.nombre,
            conteo: propios.filter((m) => m.secciones.includes(s.slug)).length,
          })).filter((s) => s.conteo > 0)
        : [],
    porCatalogo: {
      merceria: indice.filter((m) => m.catalogo === "merceria").length,
      telas: indice.filter((m) => m.catalogo === "telas").length,
    },
  };
}
