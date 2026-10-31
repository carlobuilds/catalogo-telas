/**
 * Qué modelos entran a una vista del catálogo, y en qué orden.
 * ===========================================================================
 * Filtra POR MODELO sobre el índice: catálogo, sección, categorías (contando
 * las "también aparece en"), y los filtros de variante —color, propiedad,
 * disponibilidad, precio— como "el modelo tiene AL MENOS una variante que los
 * cumple todos a la vez". Es lo mismo que luego pinta la card: la segunda
 * lectura (lib/queries.ts) trae solo esas variantes, así que un modelo que
 * pasara aquí sin ninguna saldría como card vacía.
 */
import type { Filtros } from "@/lib/filtros";
import type { Catalogo } from "@/lib/catalogos";
import type { ModeloIndice, VarianteIndice } from "@/lib/busqueda/indice";
import { buscarModelos } from "@/lib/busqueda/motor";

/**
 * Precio que se VE de una variante. Por defecto, el de la BD; `lib/queries.ts`
 * le pasa el de los precios de demo para que el tope `max` filtre por lo que
 * hay en pantalla.
 */
export type PrecioVisible = (modelo: ModeloIndice, variante: VarianteIndice) => number | null;
const precioReal: PrecioVisible = (_m, v) => v.precio;

/** ¿Hay algún filtro que se decida variante por variante? */
export function hayFiltrosDeVariante(f: Filtros): boolean {
  return f.colores.length > 0 || f.propiedades.length > 0 || f.soloDisponibles || f.precioMax != null;
}

export function cumpleVariante(
  m: ModeloIndice,
  v: VarianteIndice,
  f: Filtros,
  precioVisible: PrecioVisible = precioReal
): boolean {
  if (f.colores.length && !(v.color && f.colores.includes(v.color))) return false;
  // Varias propiedades = intersección: "bordado + brillante" pide las dos.
  if (!f.propiedades.every((p) => v.propiedades.includes(p))) return false;
  if (f.soloDisponibles && !(v.stock != null && v.stock > 0)) return false;
  if (f.precioMax != null) {
    // Sin precio no se puede afirmar que esté dentro del tope: se descarta.
    const precio = precioVisible(m, v);
    if (precio == null || precio > f.precioMax) return false;
  }
  return true;
}

/** Los modelos del catálogo que cumplen todo MENOS la búsqueda de texto. */
export function filtrarModelos(
  indice: readonly ModeloIndice[],
  catalogo: Catalogo,
  f: Filtros,
  precioVisible: PrecioVisible = precioReal
): ModeloIndice[] {
  // La sección solo existe en Mercería; en Telas un `sec` se ignora.
  const seccion = catalogo === "merceria" ? f.seccion : null;
  const porVariante = hayFiltrosDeVariante(f);
  return indice.filter(
    (m) =>
      m.catalogo === catalogo &&
      (!seccion || m.secciones.includes(seccion)) &&
      (f.categorias.length === 0 || m.categorias.some((c) => f.categorias.includes(c.slug))) &&
      (!porVariante || m.variantes.some((v) => cumpleVariante(m, v, f, precioVisible)))
  );
}

/**
 * Partición ESTABLE: primero los que tienen precio real, después el resto,
 * cada grupo en el orden en que llegó. Es la Fase 1 del plan UX: una clienta
 * que abre el catálogo ve primero lo que puede cotizar sin preguntar.
 */
export function primeroConPrecio(ids: readonly string[], conPrecio: (id: string) => boolean): string[] {
  const con: string[] = [];
  const sin: string[] = [];
  for (const id of ids) (conPrecio(id) ? con : sin).push(id);
  return [...con, ...sin];
}

export type Seleccion = {
  /** Todos los modelos de la vista, ya ordenados (sin paginar). */
  ids: string[];
  /** La búsqueda no encontró todas las palabras juntas: es lo más parecido. */
  aproximado: boolean;
};

/**
 * La vista completa: filtra, busca y ordena.
 * - Sin búsqueda: alfabético (el índice ya viene así).
 * - Con búsqueda: por relevancia, y el SKU exacto hasta arriba.
 * En los dos casos, con precio real primero.
 */
export function seleccionarModelos(
  indice: readonly ModeloIndice[],
  catalogo: Catalogo,
  f: Filtros,
  precioVisible: PrecioVisible = precioReal
): Seleccion {
  const candidatos = filtrarModelos(indice, catalogo, f, precioVisible);
  const porId = new Map(candidatos.map((m) => [m.tela_id, m]));

  // Con precio = con precio real EN LAS VARIANTES QUE SE VAN A VER: filtrar
  // por "oro" un modelo cuyo único precio es el de plata deja la card sin él.
  const porVariante = hayFiltrosDeVariante(f);
  const conPrecio = (id: string) => {
    const m = porId.get(id);
    return Boolean(
      m?.variantes.some((v) => v.precio != null && (!porVariante || cumpleVariante(m, v, f, precioVisible)))
    );
  };

  const termino = f.q.trim();
  if (!termino) {
    return { ids: primeroConPrecio(candidatos.map((m) => m.tela_id), conPrecio), aproximado: false };
  }

  const r = buscarModelos(candidatos, termino, { catalogo });
  const exactos = new Set(r.skuExacto);
  return {
    ids: [...r.skuExacto, ...primeroConPrecio(r.ids.filter((id) => !exactos.has(id)), conPrecio)],
    aproximado: r.aproximado,
  };
}
