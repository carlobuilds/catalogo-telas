/**
 * Los dos catálogos públicos: Mercería y Telas.
 * ===========================================================================
 * Las dos cosas viven en las MISMAS tablas (`tela` → `variante` → `foto`) y la
 * vista no distingue una de otra. Lo que separa un catálogo del otro es la
 * CATEGORÍA del modelo, y esa decisión vive aquí y en ningún otro lado: las
 * consultas (`lib/queries.ts`) calculan con `catalogoDeCategoria` qué slugs
 * entran a cada catálogo, así que no hay una segunda copia de la regla en SQL
 * que se pueda desincronizar.
 *
 * Por qué una lista en código y no una columna en `categoria`: la tienda pidió
 * verlo YA, y las reglas de categoría ya viven en código
 * (`lib/ingesta/categorias.ts`). Si algún día la tienda necesita decidirlo
 * desde /admin, se agrega la columna y esta función pasa a leerla.
 *
 * La portada es Mercería porque hoy el catálogo es casi todo mercería (4
 * modelos de tela contra ~170 de avíos). Voltearla es cambiar
 * `CATALOGO_PORTADA`: `/telas` y `/merceria` existen siempre como links fijos.
 */

export type Catalogo = "telas" | "merceria";

export const CATALOGO_PORTADA: Catalogo = "merceria";

export const CATALOGOS: Record<Catalogo, { nombre: string; ruta: string }> = {
  merceria: { nombre: "Mercería", ruta: "/merceria" },
  telas: { nombre: "Telas", ruta: "/telas" },
};

export function otroCatalogo(c: Catalogo): Catalogo {
  return c === "telas" ? "merceria" : "telas";
}

/** Orden del selector y del menú: la portada primero. */
export const ORDEN_CATALOGOS: readonly Catalogo[] = [CATALOGO_PORTADA, otroCatalogo(CATALOGO_PORTADA)];

/** La portada se sirve en `/`; el otro catálogo, en su ruta propia. */
export function rutaDeCatalogo(c: Catalogo): string {
  return c === CATALOGO_PORTADA ? "/" : CATALOGOS[c].ruta;
}

/** ¿Esta ruta pinta ese catálogo? `/` cuenta como la portada. */
export function esRutaDeCatalogo(pathname: string, c: Catalogo): boolean {
  return pathname === CATALOGOS[c].ruta || (pathname === "/" && c === CATALOGO_PORTADA);
}

/**
 * Categorías que son TELA de verdad, por slug. `encaje`, `saten` y `organza`
 * vienen sembradas en el SQL aunque hoy no tengan productos.
 * `tira-de-tul-bordado` NO está: es una tira (un avío), aunque sea de tul.
 */
export const CATEGORIAS_DE_TELA: ReadonlySet<string> = new Set([
  "chifon",
  "tul",
  "tul-bordado",
  "encaje",
  "saten",
  "organza",
]);

/**
 * A qué catálogo pertenece una categoría.
 *
 * Lo desconocido cae en MERCERÍA, a propósito: las telas son una lista corta y
 * estable, mientras que `/revision` crea categorías de avíos al vuelo
 * ("Lentejuela", "Broche"…). Los productos SIN categoría también caen en
 * mercería: hoy los dos que hay son aplicaciones.
 */
export function catalogoDeCategoria(slug: string | null | undefined): Catalogo {
  return slug && CATEGORIAS_DE_TELA.has(slug) ? "telas" : "merceria";
}

// ---------------------------------------------------------------------------
// Secciones de Mercería
// ---------------------------------------------------------------------------

export type Seccion = { slug: string; nombre: string; categorias: readonly string[] };

/**
 * La primera fila de botones de Mercería. Agrupan categorías, no las
 * reemplazan: elegir "Pedrería" muestra debajo solo sus categorías.
 *
 * "Cristalería" es la piedra suelta: las bolsitas de cristales que la tienda
 * vende a granel. "Pedrería" es lo que ya viene armado con piedra.
 *
 * Una categoría de mercería que no esté aquí no desaparece: sale en "Todo" y
 * como chip propio debajo de "Todo". La prueba de `catalogos.test.ts` avisa
 * cuando una categoría de la ingesta se queda sin sección.
 */
export const SECCIONES_MERCERIA: readonly Seccion[] = [
  { slug: "cristaleria", nombre: "Cristalería", categorias: ["piedra-suelta", "bolsa-de-piedra"] },
  {
    slug: "pedreria",
    nombre: "Pedrería",
    categorias: [
      "aplicacion-de-pedreria",
      "tira-de-pedreria",
      "cintillo-de-pedreria",
      "fleco-de-pedreria",
      "broche",
      "hebilla",
    ],
  },
  {
    slug: "encajes-y-tiras",
    nombre: "Encajes y tiras",
    categorias: ["tira-de-tul-bordado", "guipiur", "tira-termoadherible", "cinta"],
  },
  { slug: "flores", nombre: "Flores", categorias: ["flores", "mariposa-de-tela"] },
  {
    slug: "costura",
    nombre: "Costura",
    categorias: ["botones", "botonadura", "hilos", "cierres", "corchetes", "copas"],
  },
];

export function seccionPorSlug(slug: string | null | undefined): Seccion | null {
  return SECCIONES_MERCERIA.find((s) => s.slug === slug) ?? null;
}

export function seccionDeCategoria(slug: string | null | undefined): Seccion | null {
  return slug ? (SECCIONES_MERCERIA.find((s) => s.categorias.includes(slug)) ?? null) : null;
}
