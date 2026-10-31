/**
 * Compartir lo que se tiene filtrado: el texto, el link y las pastillas.
 * ===========================================================================
 * La vendedora arma "Pedrería › Tira de pedrería · Oro" y lo manda por
 * WhatsApp; la clienta abre el link y ve SOLO eso, con una fila de pastillas
 * que dice qué está viendo y cómo salir. Todo sale de los filtros de la URL
 * (lib/filtros.ts), así que la vista se reconstruye sola en cualquier
 * teléfono, sin cuentas ni estado guardado.
 *
 * Puro: sin React ni BD, para poder probarlo.
 */
import { type Filtros, PROPIEDADES, aQuerystring, alternar } from "@/lib/filtros";
import { type Catalogo, CATALOGOS, rutaDeCatalogo, seccionPorSlug } from "@/lib/catalogos";
import type { Facetas } from "@/lib/busqueda/facetas";

/** Slug → nombre visible de categorías y colores (salen de las facetas). */
export type NombresVista = {
  categorias: Record<string, string>;
  colores: Record<string, string>;
};

/** Los nombres que hacen falta, sacados de las facetas del catálogo. */
export function nombresDeFacetas(facetas: Pick<Facetas, "categorias" | "colores">): NombresVista {
  return {
    categorias: Object.fromEntries(facetas.categorias.map((c) => [c.slug, c.nombre])),
    colores: Object.fromEntries(facetas.colores.map((c) => [c.slug, c.nombre])),
  };
}

/** "tira-de-pedreria" → "Tira de pedreria": para un slug que ya no está en las facetas. */
function deSlug(slug: string): string {
  const texto = slug.replace(/-/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** ["Oro"] → "Oro"; ["Oro","Plata"] → "Oro y Plata"; tres o más con comas. */
function enLista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

const pesos = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/**
 * Lo que se está viendo, en palabras:
 *   "Pedrería › Tira de pedrería · Oro"
 *   "“rosas” en Mercería"
 * Es el título de la vista previa del link y el texto del mensaje.
 */
export function describirVista(f: Filtros, catalogo: Catalogo, nombres: NombresVista): string {
  const seccion = catalogo === "merceria" ? seccionPorSlug(f.seccion) : null;
  const lugar = [
    seccion?.nombre,
    f.categorias.length ? enLista(f.categorias.map((s) => nombres.categorias[s] ?? deSlug(s))) : null,
  ].filter(Boolean);

  const detalles = [
    f.colores.length ? enLista(f.colores.map((s) => nombres.colores[s] ?? deSlug(s))) : null,
    ...f.propiedades.map((p) => PROPIEDADES.find((x) => x.clave === p)?.etiqueta ?? p),
    f.soloDisponibles ? "con existencia" : null,
    f.precioMax != null ? `hasta ${pesos(f.precioMax)}` : null,
  ].filter(Boolean);

  const vista = [lugar.length ? lugar.join(" › ") : CATALOGOS[catalogo].nombre, ...detalles].join(" · ");
  return f.q ? `“${f.q}” en ${vista}` : vista;
}

/**
 * El link de la vista: la ruta del catálogo con sus filtros, SIN `ver` (la
 * paginación es de quien la estaba viendo; la clienta empieza desde arriba).
 */
export function rutaDeVista(catalogo: Catalogo, f: Filtros): string {
  const qs = aQuerystring(f);
  const base = rutaDeCatalogo(catalogo);
  return qs ? `${base}?${qs}` : base;
}

/** El mensaje de WhatsApp: qué es, el link, y qué hacer con él. */
export function mensajeCompartir(descripcion: string, url: string): string {
  return `Mira esta selección de Telas La Jalisciense: ${descripcion}\n${url}\n\nElige lo que te guste y mándame tu pedido por aquí. 🧵`;
}

export type Pastilla = {
  /** Estable para `key` de React. */
  clave: string;
  etiqueta: string;
  /** La ruta de la misma vista sin esta pastilla (la ✕). */
  sinEsta: string;
};

/**
 * Una pastilla por cada cosa activa, en el orden en que se lee la vista:
 * búsqueda, sección, categorías, colores, propiedades, existencia y precio.
 */
export function pastillasDeVista(f: Filtros, catalogo: Catalogo, nombres: NombresVista): Pastilla[] {
  const ruta = (g: Filtros) => rutaDeVista(catalogo, g);
  const pastillas: Pastilla[] = [];

  if (f.q) pastillas.push({ clave: "q", etiqueta: `“${f.q}”`, sinEsta: ruta({ ...f, q: "" }) });
  const seccion = catalogo === "merceria" ? seccionPorSlug(f.seccion) : null;
  if (seccion) pastillas.push({ clave: "sec", etiqueta: seccion.nombre, sinEsta: ruta({ ...f, seccion: null }) });
  for (const s of f.categorias) {
    pastillas.push({
      clave: `cat-${s}`,
      etiqueta: nombres.categorias[s] ?? deSlug(s),
      sinEsta: ruta(alternar(f, "categorias", s)),
    });
  }
  for (const s of f.colores) {
    pastillas.push({
      clave: `color-${s}`,
      etiqueta: nombres.colores[s] ?? deSlug(s),
      sinEsta: ruta(alternar(f, "colores", s)),
    });
  }
  for (const p of f.propiedades) {
    pastillas.push({
      clave: `prop-${p}`,
      etiqueta: PROPIEDADES.find((x) => x.clave === p)?.etiqueta ?? p,
      sinEsta: ruta(alternar(f, "propiedades", p)),
    });
  }
  if (f.soloDisponibles) {
    pastillas.push({ clave: "disp", etiqueta: "Con existencia", sinEsta: ruta({ ...f, soloDisponibles: false }) });
  }
  if (f.precioMax != null) {
    pastillas.push({ clave: "max", etiqueta: `Hasta ${pesos(f.precioMax)}`, sinEsta: ruta({ ...f, precioMax: null }) });
  }
  return pastillas;
}
