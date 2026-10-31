/**
 * Estado de los filtros del catálogo, que vive en la URL.
 * ===========================================================================
 * Todo el estado de navegación va en el querystring —no en React state— para
 * que un filtro sea COMPARTIBLE: la vendedora arma "tira de pedrería + oro",
 * copia el link y se lo manda al cliente por WhatsApp. Eso también deja que la
 * portada siga siendo un Server Component y que el botón "atrás" funcione.
 *
 * Formato:  ?q=texto&sec=pedreria&cat=tira-de-pedreria&color=oro&prop=brillante&max=50&disp=1
 *
 * Valores separados por coma en vez de la llave repetida (`cat=a&cat=b`):
 * la URL queda más corta y se lee de un vistazo cuando alguien la pega en un
 * chat, que es donde estos links terminan.
 */

import { seccionPorSlug } from "@/lib/catalogos";

/** Propiedades ópticas de la variante; los nombres son los de la vista. */
export const PROPIEDADES = [
  { clave: "bordado", columna: "es_bordado", etiqueta: "Bordado" },
  { clave: "brillante", columna: "es_brillante", etiqueta: "Brillante" },
  { clave: "traslucida", columna: "es_traslucida", etiqueta: "Translúcida" },
  { clave: "tornasol", columna: "es_tornasol", etiqueta: "Tornasol" },
] as const;

export type ClavePropiedad = (typeof PROPIEDADES)[number]["clave"];

export type Filtros = {
  /**
   * Texto libre; se resuelve en JS sobre el índice del catálogo
   * (`lib/busqueda`): sin acentos ni mayúsculas, con errores de dedo y sinónimos.
   */
  q: string;
  /**
   * Sección de Mercería (`lib/catalogos.ts`): agrupa categorías. Una sola a la
   * vez; `null` = "Todo". Los `cat` se aplican DENTRO de la sección.
   */
  seccion: string | null;
  /** Slugs de categoría. Varios = unión ("tira O piedra"). */
  categorias: string[];
  /** Slugs de color. Varios = unión. */
  colores: string[];
  propiedades: ClavePropiedad[];
  /** Precio máximo en pesos; `null` = sin tope. */
  precioMax: number | null;
  /** Solo lo que tiene existencia (`stock > 0`). */
  soloDisponibles: boolean;
};

export const FILTROS_VACIOS: Filtros = {
  q: "",
  seccion: null,
  categorias: [],
  colores: [],
  propiedades: [],
  precioMax: null,
  soloDisponibles: false,
};

/** Las llaves que este módulo maneja; el resto del querystring no se toca. */
export const LLAVES = ["q", "sec", "cat", "color", "prop", "max", "disp"] as const;

type Entrada = string | string[] | undefined;

/** Un `searchParams` de Next puede traer string o string[]; nos quedamos con el primero. */
function primero(v: Entrada): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** "a,b,,a" → ["a","b"] — sin vacíos ni repetidos, en el orden que llegaron. */
function lista(v: Entrada): string[] {
  const crudo = primero(v);
  if (!crudo) return [];
  return [...new Set(crudo.split(",").map((s) => s.trim()).filter(Boolean))];
}

const CLAVES_PROPIEDAD = new Set<string>(PROPIEDADES.map((p) => p.clave));

/**
 * Lee los filtros del querystring. Nunca lanza: un parámetro corrupto (un
 * `max=abc` que alguien tecleó a mano) se ignora en vez de tumbar la portada.
 */
export function leerFiltros(sp: Record<string, Entrada> = {}): Filtros {
  const max = Number(primero(sp.max));

  return {
    q: primero(sp.q),
    // Una sección que ya no existe se ignora, igual que una propiedad vieja.
    seccion: seccionPorSlug(primero(sp.sec))?.slug ?? null,
    categorias: lista(sp.cat),
    colores: lista(sp.color),
    // Se descarta lo que no sea una propiedad conocida: así un link viejo con
    // una propiedad que ya no existe sigue funcionando, solo que la ignora.
    propiedades: lista(sp.prop).filter((p): p is ClavePropiedad => CLAVES_PROPIEDAD.has(p)),
    precioMax: Number.isFinite(max) && max > 0 ? max : null,
    soloDisponibles: primero(sp.disp) === "1",
  };
}

/**
 * Filtros → querystring, omitiendo lo que está en su valor por defecto para
 * que la URL de "sin filtros" sea `/` limpia y no `/?cat=&color=&max=`.
 * Devuelve "" cuando no hay nada activo.
 */
export function aQuerystring(f: Filtros): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.seccion) p.set("sec", f.seccion);
  if (f.categorias.length) p.set("cat", f.categorias.join(","));
  if (f.colores.length) p.set("color", f.colores.join(","));
  if (f.propiedades.length) p.set("prop", f.propiedades.join(","));
  if (f.precioMax != null) p.set("max", String(f.precioMax));
  if (f.soloDisponibles) p.set("disp", "1");
  // La coma es el separador de las listas y es válida en un querystring:
  // dejarla literal hace que el link pegado en WhatsApp se lea
  // ("color=oro,plata" y no "color=oro%2Cplata").
  return p.toString().replace(/%2C/gi, ",");
}

/** ¿Hay algo activo? Decide si se muestra el botón de limpiar. */
export function hayFiltrosActivos(f: Filtros): boolean {
  return aQuerystring(f) !== "";
}

/** Cuántos filtros hay puestos (para el contador del botón en mobile). */
export function cuentaFiltros(f: Filtros): number {
  return (
    (f.seccion ? 1 : 0) +
    f.categorias.length +
    f.colores.length +
    f.propiedades.length +
    (f.precioMax != null ? 1 : 0) +
    (f.soloDisponibles ? 1 : 0)
  );
}

/** Facetas multivaluadas: las que se prenden y apagan picando un chip. */
export type FacetaLista = "categorias" | "colores" | "propiedades";

/**
 * Prende o apaga un valor de una faceta. Inmutable: devuelve filtros nuevos,
 * que es lo que espera el componente para armar el `href` de cada chip.
 */
export function alternar(f: Filtros, faceta: FacetaLista, valor: string): Filtros {
  const actuales = f[faceta] as string[];
  const siguiente = actuales.includes(valor)
    ? actuales.filter((v) => v !== valor)
    : [...actuales, valor];
  return { ...f, [faceta]: siguiente };
}
