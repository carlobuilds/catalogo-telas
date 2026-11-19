import type { MetadataRoute } from "next";
import { getIndiceCatalogo } from "@/lib/queries";
import { ORDEN_CATALOGOS, rutaDeCatalogo } from "@/lib/catalogos";
import { SITE_URL } from "@/lib/sitio";

/**
 * /sitemap.xml — los catálogos y la ficha de cada producto.
 *
 * Sale del mismo índice cacheado que usa el buscador, con la llave pública:
 * es la lectura que haría cualquier visitante. Se regenera cada hora; si se
 * prerenderizara en el build (que corre sin llaves), saldría vacío para siempre.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalogos = [...new Set(ORDEN_CATALOGOS.map(rutaDeCatalogo))].map((ruta) => ({
    url: `${SITE_URL}${ruta}`,
  }));

  let fichas: MetadataRoute.Sitemap = [];
  try {
    const modelos = await getIndiceCatalogo();
    fichas = modelos.map((m) => ({ url: `${SITE_URL}/tela/${encodeURIComponent(m.slug)}` }));
  } catch {
    // Sin índice, al menos los catálogos: un sitemap a medias es mejor que un 500.
  }

  return [...catalogos, ...fichas];
}
