import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { CatalogoTela } from "@/lib/types";
import type { FotoVariante } from "@/lib/fotos";
import { aplicarPreciosDemo, resolveDemoPrice } from "@/lib/demo-prices";
import {
  type Filtros,
  FILTROS_VACIOS,
  PROPIEDADES,
  aQuerystring,
} from "@/lib/filtros";
import { type Catalogo, CATALOGO_PORTADA } from "@/lib/catalogos";
import { type FilaIndice, type ModeloIndice, construirIndice } from "@/lib/busqueda/indice";
import { FACETAS_VACIAS, type Facetas, facetasDeIndice } from "@/lib/busqueda/facetas";
import { type PrecioVisible, seleccionarModelos } from "@/lib/busqueda/seleccion";

// Los tipos de las facetas viven con el índice; se re-exportan aquí porque
// los componentes ya los importaban de este módulo.
export { FACETAS_VACIAS, type Faceta, type Facetas } from "@/lib/busqueda/facetas";

/** ¿Están las variables de entorno de Supabase configuradas? */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export type ResultadoCatalogo = {
  data: CatalogoTela[];
  error: string | null;
  configurado: boolean;
  /**
   * Cuántos MODELOS cumplen los filtros en total — no cuántas filas ni cuántos
   * se están mostrando. Es el número del contador y lo que decide si queda
   * "Ver más".
   */
  totalModelos: number;
  /** La búsqueda no encontró todas las palabras juntas: se muestra lo más parecido. */
  aproximado: boolean;
};

/** Cuántos modelos trae cada "Ver más". */
export const MODELOS_POR_PAGINA = 48;

/**
 * Caché de datos (no de ruta): las páginas son dinámicas porque leen
 * `searchParams`, así que el `revalidate` a nivel página no aplica. En cambio,
 * `unstable_cache` sí cachea el RESULTADO de la query entre requests, con
 * revalidación cada 60s → cada visita ya no pega a Supabase.
 *
 * Las funciones cacheadas LANZAN en error: `unstable_cache` no guarda
 * excepciones, así que un fallo transitorio no queda cacheado 60s.
 */
const REVALIDATE_SEGUNDOS = 60;

/** 42703 = "undefined_column": una columna de una sección del SQL que aún no corre. */
const COLUMNA_INEXISTENTE = "42703";

/**
 * PostgREST devuelve el mismo builder en cada `.in()/.eq()/.gt()`, pero
 * tiparlo exactamente obliga a arrastrar los genéricos de la vista por todo el
 * módulo. Este alias acota el `any` a un solo lugar.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Consulta = any;

// ---------------------------------------------------------------------------
// Índice del catálogo (lib/busqueda): filtrar, buscar y contar sin ir a la BD
// ---------------------------------------------------------------------------

/** Lo que el índice lee de la vista; nada pesado (sin descripción, sin arreglos de usos). */
const COLUMNAS_INDICE = [
  "variante_id",
  "tela_id",
  "tela_slug",
  "tela_nombre",
  "categoria",
  "categoria_slug",
  "sku",
  "color_nombre",
  "color_slug",
  "color_hex",
  "precio_metro",
  "unidad_venta",
  "stock",
  ...PROPIEDADES.map((p) => p.columna),
  "foto_principal",
  "foto_principal_derivados",
  "variante_orden",
].join(",");

/** La vista se lee de mil en mil: es el tope de filas por respuesta de PostgREST. */
const FILAS_POR_LECTURA = 1000;

/**
 * Toda la vista, paginada con `order`: sin orden, dos páginas consecutivas
 * pueden encimarse y el índice duplicaría o perdería variantes.
 *
 * `categorias_extra` llega con la sección 16 del SQL (producto en varias
 * secciones). Mientras Carlo no la corra, la vista no la tiene (42703) y se
 * lee sin ella: cada producto queda solo en su categoría principal.
 */
async function leerFilasIndice(): Promise<FilaIndice[]> {
  const supabase = createPublicClient();
  const leer = async (columnas: string) => {
    const filas: FilaIndice[] = [];
    for (let desde = 0; ; desde += FILAS_POR_LECTURA) {
      const { data, error } = await supabase
        .from("catalogo_telas")
        .select(columnas)
        .order("variante_id", { ascending: true })
        .range(desde, desde + FILAS_POR_LECTURA - 1);
      if (error) return { filas, error };
      filas.push(...((data ?? []) as unknown as FilaIndice[]));
      if ((data?.length ?? 0) < FILAS_POR_LECTURA) return { filas, error: null };
    }
  };

  let r = await leer(`${COLUMNAS_INDICE},categorias_extra`);
  if (r.error?.code === COLUMNA_INEXISTENTE) r = await leer(COLUMNAS_INDICE);
  if (r.error) throw new Error(r.error.message);
  return r.filas;
}

/**
 * El índice, cacheado 60s con el tag `catalogo` (las acciones de /admin y
 * /revision lo invalidan al guardar). Cada visita, cada tecla del buscador y
 * cada vista previa de un link leen de aquí, no de Supabase.
 */
const indiceCached = unstable_cache(
  async (): Promise<ModeloIndice[]> => {
    const supabase = createPublicClient();
    const [filas, { data: categorias, error }] = await Promise.all([
      leerFilasIndice(),
      supabase.from("categoria").select("slug,nombre"),
    ]);
    if (error) throw new Error(error.message);
    const nombres = Object.fromEntries((categorias ?? []).map((c) => [c.slug as string, c.nombre as string]));
    return construirIndice(filas, nombres);
  },
  ["catalogo-indice"],
  { revalidate: REVALIDATE_SEGUNDOS, tags: ["catalogo"] }
);

/**
 * `cache` de React encima: la portada pide el índice dos veces en el mismo
 * render (grid y chips) y así se resuelve una sola.
 */
export const getIndiceCatalogo = cache(async (): Promise<ModeloIndice[]> => {
  if (!isSupabaseConfigured()) return [];
  return indiceCached();
});

/**
 * Precio que se ve en pantalla de una variante del índice: el real, o el de
 * demo si está prendido. El tope `max` filtra por lo que la clienta ve.
 */
const precioEnPantalla: PrecioVisible = (m, v) =>
  resolveDemoPrice({
    variante_id: v.id,
    categoria_slug: m.categoria?.slug ?? null,
    precio_metro: v.precio,
  });

// ---------------------------------------------------------------------------
// Filas de una página del grid
// ---------------------------------------------------------------------------

/**
 * Los filtros que se deciden POR VARIANTE, traducidos a la vista: al filtrar
 * "oro", la card del modelo muestra solo sus variantes doradas (un swatch), no
 * todos sus colores. Es lo que espera quien filtró —pidió oro, ve oro— y además
 * hace que el "desde $X" de la card corresponda a lo que quedó visible.
 *
 * El precio NO se filtra aquí: los precios de demo se rellenan en JS después
 * de la query (`aplicarPreciosDemo`), así que un `lte` en SQL descartaría
 * productos que en pantalla sí muestran un precio dentro del tope.
 */
function aplicarFiltrosDeVariante(q: Consulta, f: Pick<Filtros, "colores" | "propiedades" | "soloDisponibles">): Consulta {
  if (f.colores.length) q = q.in("color_slug", f.colores);
  // Varias propiedades = intersección: "bordado + brillante" pide las dos.
  for (const clave of f.propiedades) {
    const prop = PROPIEDADES.find((p) => p.clave === clave);
    if (prop) q = q.eq(prop.columna, true);
  }
  if (f.soloDisponibles) q = q.gt("stock", 0);
  return q;
}

/** Se aplica tras los precios de demo, para filtrar por lo que se ve en pantalla. */
function filtrarPorPrecio(filas: CatalogoTela[], precioMax: number | null): CatalogoTela[] {
  if (precioMax == null) return filas;
  // Sin precio no se puede afirmar que esté dentro del tope: se descarta.
  return filas.filter((f) => f.precio_metro != null && f.precio_metro <= precioMax);
}

/**
 * Ordena las filas de una consulta igual que el grid: por modelo, y dentro de
 * cada modelo por el orden manual de colores. `variante_orden` solo existe tras
 * la sección 11 del SQL, de ahí el reintento sin ella.
 */
async function leerOrdenado(consulta: () => Consulta): Promise<CatalogoTela[]> {
  const conOrdenManual = () =>
    consulta()
      .order("tela_nombre", { ascending: true })
      .order("variante_orden", { ascending: true })
      .order("color_nombre", { ascending: true });

  const sinOrdenManual = () =>
    consulta()
      .order("tela_nombre", { ascending: true })
      .order("color_nombre", { ascending: true });

  let { data, error } = await conOrdenManual();
  if (error?.code === COLUMNA_INEXISTENTE) ({ data, error } = await sinOrdenManual());

  if (error) throw new Error(error.message);
  return (data ?? []) as CatalogoTela[];
}

/**
 * Cuántos `tela_id` caben en un `.in()`: la lista viaja en la URL, y con
 * "Ver más" una página puede llegar a cientos de modelos. Por eso se parte.
 */
const IDS_POR_LECTURA = 48;

export function enTrozos<T>(lista: readonly T[], tamano: number): T[][] {
  const trozos: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) trozos.push(lista.slice(i, i + tamano));
  return trozos;
}

/**
 * Todas las filas (variantes) de los modelos de una página, en el orden de la
 * página. Vuelve a aplicar los filtros de variante para que "oro" siga
 * mostrando solo los dorados.
 *
 * Los grupos se reordenan al final según `pagina`: el orden ya lo decidió el
 * índice (con precio primero, relevancia), y SQL solo sabe ordenar por nombre.
 */
const filasDePaginaCached = unstable_cache(
  async (paginaJson: string, filtrosVarianteJson: string): Promise<CatalogoTela[]> => {
    const pagina = JSON.parse(paginaJson) as string[];
    const filtros = JSON.parse(filtrosVarianteJson) as Pick<
      Filtros,
      "colores" | "propiedades" | "soloDisponibles"
    >;
    const supabase = createPublicClient();

    const filas: CatalogoTela[] = [];
    for (const ids of enTrozos(pagina, IDS_POR_LECTURA)) {
      filas.push(
        ...(await leerOrdenado(() =>
          aplicarFiltrosDeVariante(supabase.from("catalogo_telas").select("*"), filtros).in("tela_id", ids)
        ))
      );
    }
    return ordenarPorPagina(filas, pagina);
  },
  ["catalogo-pagina-filas"],
  { revalidate: REVALIDATE_SEGUNDOS, tags: ["catalogo"] }
);

/**
 * Agrupa las filas por modelo en el orden de `pagina`, sin mover el orden de
 * los colores dentro de cada modelo (sort estable). Exportada para probarla.
 */
export function ordenarPorPagina<T extends { tela_id: string }>(filas: T[], pagina: readonly string[]): T[] {
  const posicion = new Map(pagina.map((id, i) => [id, i]));
  return [...filas].sort(
    (a, b) => (posicion.get(a.tela_id) ?? Infinity) - (posicion.get(b.tela_id) ?? Infinity)
  );
}

/**
 * Una página del catálogo, PAGINADA POR MODELO.
 * ---------------------------------------------------------------------------
 * La vista trae una fila por VARIANTE pero el grid pinta una card por MODELO,
 * así que paginar por filas parte un modelo entre dos páginas: la card sale
 * con la mitad de sus colores y el "desde $X" cambia según en qué página caiga.
 * Por eso son dos pasos:
 *
 *   1. Sobre el índice (en memoria): qué modelos cumplen los filtros y la
 *      búsqueda, en orden —con precio real primero; con búsqueda, por
 *      relevancia y el SKU exacto hasta arriba—. Da el TOTAL honesto.
 *   2. Las filas completas de los modelos de esta página.
 *
 * La búsqueda (`q`) se resuelve en el paso 1 con `lib/busqueda`: insensible a
 * acentos y mayúsculas, tolera errores de dedo y entiende sinónimos. Los chips
 * se aplican igual con o sin búsqueda: buscar "piedra" y luego acotar a
 * "Piedra suelta" funciona como sin búsqueda.
 */
export async function getCatalogo(
  {
    catalogo = CATALOGO_PORTADA,
    hasta = MODELOS_POR_PAGINA,
    filtros = FILTROS_VACIOS,
  }: { catalogo?: Catalogo; hasta?: number; filtros?: Filtros } = {}
): Promise<ResultadoCatalogo> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null, configurado: false, totalModelos: 0, aproximado: false };
  }

  try {
    const indice = await getIndiceCatalogo();
    const { ids, aproximado } = seleccionarModelos(indice, catalogo, filtros, precioEnPantalla);
    const pagina = ids.slice(0, hasta);
    const filas = pagina.length
      ? await filasDePaginaCached(
          JSON.stringify(pagina),
          JSON.stringify({
            colores: filtros.colores,
            propiedades: filtros.propiedades,
            soloDisponibles: filtros.soloDisponibles,
          })
        )
      : [];
    return {
      data: filtrarPorPrecio(aplicarPreciosDemo(filas), filtros.precioMax),
      error: null,
      configurado: true,
      totalModelos: ids.length,
      aproximado,
    };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    return { data: [], error: mensaje, configurado: true, totalModelos: 0, aproximado: false };
  }
}

const telaPorSlugCached = unstable_cache(
  async (slug: string): Promise<CatalogoTela[]> => {
    const supabase = createPublicClient();
    let { data, error } = await supabase
      .from("catalogo_telas")
      .select("*")
      .eq("tela_slug", slug)
      .order("variante_orden", { ascending: true })
      .order("color_nombre", { ascending: true });

    if (error?.code === COLUMNA_INEXISTENTE) {
      ({ data, error } = await supabase
        .from("catalogo_telas")
        .select("*")
        .eq("tela_slug", slug)
        .order("color_nombre", { ascending: true }));
    }

    if (error) throw new Error(error.message);
    return (data ?? []) as CatalogoTela[];
  },
  ["catalogo-tela"],
  { revalidate: REVALIDATE_SEGUNDOS, tags: ["catalogo"] }
);

/**
 * Todas las variantes (colores) de un modelo, por su slug.
 * Para la página de detalle `/tela/[slug]`. Lista vacía → 404 en la página.
 * Lectura cacheada (60s), igual que el listado.
 */
export async function getTelaPorSlug(slug: string): Promise<CatalogoTela[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const data = await telaPorSlugCached(slug);
    return aplicarPreciosDemo(data);
  } catch {
    return [];
  }
}

/** Columnas de `foto`; `derivados` es de la sección 12 y puede no existir aún. */
const COLUMNAS_FOTO = "id,variante_id,ruta,orden,alt";

const fotosDeVariantesCached = unstable_cache(
  async (varianteIds: string[]): Promise<FotoVariante[]> => {
    const supabase = createPublicClient();

    // Mismo desempate que el `foto_principal` de la vista (orden, created_at),
    // así el primer slide es exactamente la foto que ya salía en el grid.
    const leer = (columnas: string) =>
      supabase
        .from("foto")
        .select(columnas)
        .in("variante_id", varianteIds)
        .order("orden", { ascending: true })
        .order("created_at", { ascending: true });

    let { data, error } = await leer(`${COLUMNAS_FOTO},derivados`);
    if (error?.code === COLUMNA_INEXISTENTE) ({ data, error } = await leer(COLUMNAS_FOTO));

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FotoVariante[];
  },
  ["catalogo-fotos"],
  { revalidate: REVALIDATE_SEGUNDOS, tags: ["catalogo"] }
);

/**
 * TODAS las fotos de unas variantes — no solo la principal.
 *
 * La vista `catalogo_telas` colapsa las N fotos de cada variante en un único
 * `foto_principal` (`… order by orden limit 1`), así que el resto del carrete
 * solo se puede leer de la tabla `foto`. Tiene RLS de lectura pública, igual
 * que el resto del catálogo, así que va con la llave anon.
 *
 * Los ids se ordenan para que la llave de caché no dependa del orden en que
 * llegaron las variantes. Si falla, devuelve vacío: la ficha cae a la foto
 * principal de la vista y sigue funcionando.
 */
export async function getFotosDeVariantes(
  varianteIds: string[]
): Promise<FotoVariante[]> {
  if (!isSupabaseConfigured() || varianteIds.length === 0) return [];
  try {
    return await fotosDeVariantesCached([...varianteIds].sort());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Facetas: qué chips pintar y con cuántos productos cada uno
// ---------------------------------------------------------------------------

/**
 * Facetas del catálogo COMPLETO, no del resultado filtrado: los conteos de los
 * chips no bailan al picar uno, y nunca queda un chip que ya no se puede
 * despicar porque desapareció de la lista. Salen del mismo índice que la
 * búsqueda, así que cuentan las categorías "también aparece en".
 */
export async function getFacetas(catalogo: Catalogo = CATALOGO_PORTADA): Promise<Facetas> {
  if (!isSupabaseConfigured()) return FACETAS_VACIAS;
  try {
    return facetasDeIndice(await getIndiceCatalogo(), catalogo);
  } catch {
    return FACETAS_VACIAS;
  }
}

/** Firma estable de unos filtros; útil como `key` de Suspense en la portada. */
export function firmaFiltros(filtros: Filtros): string {
  return aQuerystring(filtros);
}
