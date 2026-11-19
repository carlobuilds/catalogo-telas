import type { CatalogoTela } from "@/lib/types";

/**
 * Avance de captura para cerrar la Fase 1 del catálogo.
 *
 * /revision mostraba un solo número: cuántas variantes están "revisadas". Pero
 * "revisada" es un interruptor aparte de los datos (`marcarRevisado` no exige
 * nada), así que una variante puede estar revisada y SIN precio. Para saber
 * cuánto falta de verdad se cuentan por separado revisadas, con precio y con
 * foto, y las que cumplen las tres: las listas para entregar.
 *
 * Todo se calcula al vuelo con lo que /revision ya lee: nada se escribe.
 */
export type VarianteDeCierre = Pick<
  CatalogoTela,
  "revisado_en" | "precio_metro" | "foto_principal" | "nota" | "unidad_venta"
>;

export function tienePrecio(v: Pick<CatalogoTela, "precio_metro">): boolean {
  return v.precio_metro != null;
}

export function estaRevisada(v: Pick<CatalogoTela, "revisado_en">): boolean {
  return v.revisado_en != null;
}

/**
 * ¿El color tiene foto? La vista colapsa sus fotos en `foto_principal` (la de
 * menor `orden`): si es null, el color no tiene ninguna.
 */
export function tieneFoto(v: Pick<CatalogoTela, "foto_principal">): boolean {
  return v.foto_principal != null;
}

/**
 * ¿Esta variante ya está lista para entregar el catálogo? Es la definición de
 * "terminado" de la Fase 1: la usan la barra de avance de /revision y el acta
 * de entrega.
 *
 * Decisión de Carlo (2026-11-19): revisada, con precio y con su foto. "Una
 * foto por color" se toma como AL MENOS una: en tela, varias fotos de un color
 * son tomas de caída o de detalle (ver `politicaDeProducto` en
 * lib/admin/sospechosos.ts); las repetidas de mercería ya las marca "Para
 * corregir" en /admin. Un precio "a consultar" no cuenta como listo.
 */
export function esVarianteLista(v: VarianteDeCierre): boolean {
  return estaRevisada(v) && tienePrecio(v) && tieneFoto(v);
}

export type Avance = {
  total: number;
  revisadas: number;
  conPrecio: number;
  conFoto: number;
  listas: number;
};

/** Las cifras de la barra, sobre TODAS las variantes que trajo la búsqueda. */
export function contarAvance(
  variantes: readonly VarianteDeCierre[],
  esLista: (v: VarianteDeCierre) => boolean = esVarianteLista
): Avance {
  let revisadas = 0;
  let conPrecio = 0;
  let conFoto = 0;
  let listas = 0;
  for (const v of variantes) {
    if (estaRevisada(v)) revisadas++;
    if (tienePrecio(v)) conPrecio++;
    if (tieneFoto(v)) conFoto++;
    if (esLista(v)) listas++;
  }
  return { total: variantes.length, revisadas, conPrecio, conFoto, listas };
}

/** Chips de /revision. `pendientes` conserva el nombre del parámetro de antes. */
export type FiltroRevision = "todos" | "pendientes" | "sinprecio" | "sinfoto";

export function filtroDesdeParams(p: {
  pendientes?: string;
  sinprecio?: string;
  sinfoto?: string;
}): FiltroRevision {
  if (p.sinprecio === "1") return "sinprecio";
  if (p.sinfoto === "1") return "sinfoto";
  if (p.pendientes === "1") return "pendientes";
  return "todos";
}

/** ¿El producto se queda en la lista con este chip? Basta con UN color que falte. */
export function productoPasaFiltro(
  variantes: readonly VarianteDeCierre[],
  filtro: FiltroRevision
): boolean {
  switch (filtro) {
    case "todos":
      return true;
    case "pendientes":
      return variantes.some((v) => !estaRevisada(v));
    case "sinprecio":
      return variantes.some((v) => !tienePrecio(v));
    case "sinfoto":
      return variantes.some((v) => !tieneFoto(v));
  }
}
