import { NextResponse, type NextRequest } from "next/server";
import { getIndiceCatalogo } from "@/lib/queries";
import { buscarModelos, sugerirGrupos } from "@/lib/busqueda/motor";
import { type Catalogo, CATALOGO_PORTADA, otroCatalogo, seccionDeCategoria } from "@/lib/catalogos";
import { publicImageUrl, urlDerivado } from "@/lib/supabase/storage";
import { unidadDe } from "@/lib/unidades";

/**
 * Sugerencias del buscador mientras se escribe:  GET /api/sugerencias?q=&catalogo=
 * ---------------------------------------------------------------------------
 * Lee el índice cacheado del servidor (lib/queries.ts → lib/busqueda), así que
 * cada tecla cuesta milisegundos y no una consulta a Supabase. Al cliente solo
 * le llega lo que va a pintar: atajos a secciones, categorías y colores, y
 * hasta 6 productos con su foto chica y su precio REAL (nunca el de demo: una
 * sugerencia no debe prometer un precio que la tienda no capturó).
 */

export type SugerenciaProducto = {
  slug: string;
  nombre: string;
  categoria: string | null;
  foto: string | null;
  precio: number | null;
  /** "/pieza", "/m"… de la unidad de la variante que puso ese precio. */
  sufijo: string | null;
  /** Hay variantes con precios distintos: el precio es "desde". */
  desde: boolean;
};

export type RespuestaSugerencias = {
  q: string;
  catalogo: Catalogo;
  secciones: { slug: string; nombre: string; conteo: number }[];
  categorias: { slug: string; nombre: string; conteo: number; seccion: string | null }[];
  colores: { slug: string; nombre: string; hex: string | null; conteo: number }[];
  productos: SugerenciaProducto[];
  /** Cuántos productos hay en total con esa búsqueda en este catálogo. */
  total: number;
  aproximado: boolean;
  /** Para "Sin coincidencias en Mercería · Buscar en Telas (3)". */
  enOtroCatalogo: { catalogo: Catalogo; total: number };
};

const MAX_PRODUCTOS = 6;
/** Nadie teclea más que esto en un buscador; lo demás es abuso o un pegado accidental. */
const MAX_LARGO = 80;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, MAX_LARGO);
  const param = req.nextUrl.searchParams.get("catalogo");
  const catalogo: Catalogo = param === "telas" || param === "merceria" ? param : CATALOGO_PORTADA;
  const otro = otroCatalogo(catalogo);

  let indice;
  try {
    indice = await getIndiceCatalogo();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el catálogo" }, { status: 503 });
  }

  const r = buscarModelos(indice, q, { catalogo });
  const grupos = sugerirGrupos(indice, q, catalogo);
  const porId = new Map(indice.map((m) => [m.tela_id, m]));

  const productos: SugerenciaProducto[] = r.ids.slice(0, MAX_PRODUCTOS).map((id) => {
    const m = porId.get(id)!;
    const precios = new Set(m.variantes.map((v) => v.precio).filter((p) => p != null));
    return {
      slug: m.slug,
      nombre: m.nombre,
      categoria: m.categoria?.nombre ?? null,
      foto: m.foto ? (urlDerivado(m.foto.derivados, "sm") ?? publicImageUrl(m.foto.ruta)) : null,
      precio: m.precioDesde,
      sufijo: m.precioDesde != null ? unidadDe(m.unidadDesde).sufijoPrecio : null,
      desde: precios.size > 1,
    };
  });

  const cuerpo: RespuestaSugerencias = {
    q,
    catalogo,
    secciones: grupos.secciones.map(({ slug, nombre, conteo }) => ({ slug, nombre, conteo })),
    categorias: grupos.categorias.map(({ slug, nombre, conteo }) => ({
      slug,
      nombre,
      conteo,
      seccion: catalogo === "merceria" ? (seccionDeCategoria(slug)?.slug ?? null) : null,
    })),
    colores: grupos.colores.map(({ slug, nombre, hex, conteo }) => ({ slug, nombre, hex: hex ?? null, conteo })),
    productos,
    total: r.ids.length,
    aproximado: r.aproximado,
    enOtroCatalogo: { catalogo: otro, total: q ? buscarModelos(indice, q, { catalogo: otro }).ids.length : 0 },
  };

  return NextResponse.json(cuerpo, {
    headers: { "Cache-Control": "public, s-maxage=60" },
  });
}
