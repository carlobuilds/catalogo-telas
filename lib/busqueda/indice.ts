/**
 * Índice del catálogo: un registro por MODELO con lo que hace falta para
 * filtrar, buscar, ordenar y sugerir, sin volver a la BD.
 * ===========================================================================
 * El catálogo es chico (~190 modelos, ~475 variantes), así que cabe completo
 * en la memoria del servidor: `getIndiceCatalogo` (lib/queries.ts) lo cachea
 * 60s y la búsqueda corre en JS sobre él. Al cliente nunca viaja entero, solo
 * las sugerencias.
 *
 * Es JSON puro (sin Map ni Set) porque `unstable_cache` lo serializa.
 */
import type { CatalogoTela, DerivadosFoto } from "@/lib/types";
import { PROPIEDADES, type ClavePropiedad } from "@/lib/filtros";
import {
  type Catalogo,
  SECCIONES_MERCERIA,
  catalogoDeCategoria,
  seccionDeCategoria,
} from "@/lib/catalogos";
import { compacto, tokens } from "@/lib/busqueda/normalizar";

/** Columnas de la vista que lee el índice. `categorias_extra` llega con la sección 16 del SQL. */
export type FilaIndice = Pick<
  CatalogoTela,
  | "variante_id"
  | "tela_id"
  | "tela_slug"
  | "tela_nombre"
  | "categoria"
  | "categoria_slug"
  | "sku"
  | "color_nombre"
  | "color_slug"
  | "color_hex"
  | "precio_metro"
  | "unidad_venta"
  | "stock"
  | "es_bordado"
  | "es_brillante"
  | "es_traslucida"
  | "es_tornasol"
  | "foto_principal"
  | "foto_principal_derivados"
  | "variante_orden"
> & { categorias_extra?: string[] | null };

export type CampoBusqueda = "nombre" | "sku" | "categoria" | "seccion" | "color";

export type VarianteIndice = {
  id: string;
  color: string | null;
  propiedades: ClavePropiedad[];
  stock: number | null;
  /** El precio de la BD, ANTES de los precios de demo: el que es de verdad. */
  precio: number | null;
};

export type CategoriaIndice = { slug: string; nombre: string };

export type ModeloIndice = {
  tela_id: string;
  slug: string;
  nombre: string;
  /** Lo decide SOLO la categoría principal (lib/catalogos.ts). */
  catalogo: Catalogo;
  /** La principal: la que muestra la card. */
  categoria: CategoriaIndice | null;
  /**
   * Principal + "también aparece en" del MISMO catálogo: una extra del otro
   * catálogo se ignora, porque un producto no puede vivir en los dos.
   */
  categorias: CategoriaIndice[];
  /** Secciones de Mercería a las que entra por alguna de sus categorías. */
  secciones: string[];
  colores: { slug: string; nombre: string; hex: string | null }[];
  skus: string[];
  variantes: VarianteIndice[];
  tienePrecioReal: boolean;
  /** El menor precio REAL y la unidad de esa variante (no la del modelo). */
  precioDesde: number | null;
  unidadDesde: string | null;
  /** Foto de la primera variante (orden manual) que tiene foto. */
  foto: { ruta: string; derivados: DerivadosFoto | null } | null;
  /** Palabras ya normalizadas de cada campo, listas para comparar. */
  campos: Record<CampoBusqueda, string[]>;
  /** Los SKU sin guiones ni espacios: "BNK-2030-68" → "bnk203068". */
  skusCompactos: string[];
};

/** Nombres de las secciones, para buscarlas por nombre ("pedrería" → Pedrería). */
const NOMBRE_SECCION = new Map(SECCIONES_MERCERIA.map((s) => [s.slug, s.nombre]));

const unicas = (xs: string[]) => [...new Set(xs)];

/**
 * Filas de la vista (una por variante) → un `ModeloIndice` por modelo, en
 * orden alfabético. `nombresCategoria` (slug → nombre de la tabla `categoria`)
 * pone nombre a las categorías extra; sin él, la extra se nombra con su slug.
 */
export function construirIndice(
  filas: FilaIndice[],
  nombresCategoria: Record<string, string> = {}
): ModeloIndice[] {
  const porModelo = new Map<string, FilaIndice[]>();
  for (const f of filas) {
    const lista = porModelo.get(f.tela_id) ?? [];
    lista.push(f);
    porModelo.set(f.tela_id, lista);
  }

  const modelos: ModeloIndice[] = [];
  for (const [telaId, variantesCrudas] of porModelo) {
    // Mismo orden que la ficha: el orden manual de colores, luego el nombre.
    const variantes = [...variantesCrudas].sort(
      (a, b) =>
        (a.variante_orden ?? 0) - (b.variante_orden ?? 0) ||
        (a.color_nombre ?? "").localeCompare(b.color_nombre ?? "", "es") ||
        a.variante_id.localeCompare(b.variante_id)
    );
    const primera = variantes[0];
    const catalogo = catalogoDeCategoria(primera.categoria_slug);

    const principal: CategoriaIndice | null = primera.categoria_slug
      ? { slug: primera.categoria_slug, nombre: primera.categoria ?? primera.categoria_slug }
      : null;
    const extras = unicas(variantes.flatMap((v) => v.categorias_extra ?? []))
      .filter((slug) => slug !== principal?.slug && catalogoDeCategoria(slug) === catalogo)
      .map((slug) => ({ slug, nombre: nombresCategoria[slug] ?? slug }));
    const categorias = principal ? [principal, ...extras] : extras;

    const secciones =
      catalogo === "merceria"
        ? unicas(
            categorias
              .map((c) => seccionDeCategoria(c.slug)?.slug)
              .filter((s): s is string => Boolean(s))
          )
        : [];

    const colores: ModeloIndice["colores"] = [];
    for (const v of variantes) {
      if (v.color_slug && v.color_nombre && !colores.some((c) => c.slug === v.color_slug)) {
        colores.push({ slug: v.color_slug, nombre: v.color_nombre, hex: v.color_hex });
      }
    }

    const skus = unicas(variantes.map((v) => v.sku?.trim() ?? "").filter(Boolean));

    let precioDesde: number | null = null;
    let unidadDesde: string | null = null;
    for (const v of variantes) {
      if (v.precio_metro != null && (precioDesde == null || v.precio_metro < precioDesde)) {
        precioDesde = v.precio_metro;
        unidadDesde = v.unidad_venta ?? null;
      }
    }

    const conFoto = variantes.find((v) => v.foto_principal);

    modelos.push({
      tela_id: telaId,
      slug: primera.tela_slug,
      nombre: primera.tela_nombre,
      catalogo,
      categoria: principal,
      categorias,
      secciones,
      colores,
      skus,
      variantes: variantes.map((v) => ({
        id: v.variante_id,
        color: v.color_slug,
        propiedades: PROPIEDADES.filter((p) => v[p.columna]).map((p) => p.clave),
        stock: v.stock,
        precio: v.precio_metro,
      })),
      tienePrecioReal: precioDesde != null,
      precioDesde,
      unidadDesde,
      foto: conFoto
        ? { ruta: conFoto.foto_principal!, derivados: conFoto.foto_principal_derivados ?? null }
        : null,
      campos: {
        nombre: unicas(tokens(primera.tela_nombre)),
        sku: unicas(skus.flatMap((s) => tokens(s))),
        categoria: unicas(categorias.flatMap((c) => tokens(c.nombre))),
        seccion: unicas(secciones.flatMap((s) => tokens(NOMBRE_SECCION.get(s)))),
        color: unicas(colores.flatMap((c) => tokens(c.nombre))),
      },
      skusCompactos: unicas(skus.map(compacto).filter(Boolean)),
    });
  }

  return modelos.sort(porNombre);
}

/** Orden alfabético en español, estable: dos modelos homónimos desempatan por id. */
export function porNombre(a: { nombre: string; tela_id: string }, b: { nombre: string; tela_id: string }) {
  return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }) || a.tela_id.localeCompare(b.tela_id);
}
