import type { Metadata } from "next";
import { getFacetas, getPortadaDeVista } from "@/lib/queries";
import { type Filtros, aQuerystring, hayFiltrosActivos, leerFiltros } from "@/lib/filtros";
import { type Catalogo, CATALOGOS } from "@/lib/catalogos";
import { describirVista, nombresDeFacetas } from "@/lib/compartir";
import { publicImageUrl, urlDerivado } from "@/lib/supabase/storage";

/**
 * Vista previa del link de una selección, para WhatsApp.
 * ===========================================================================
 * Quien recibe "/?sec=pedreria&cat=tira-de-pedreria&color=oro" ve, antes de
 * abrirlo, qué le mandaron: "Pedrería › Tira de pedrería · Oro", cuántos
 * artículos son y la foto del primero (el derivado `lg`, el mismo que lee el
 * agente de WhatsApp). Sin filtros se queda la metadata de siempre.
 *
 * Las URLs de las fotos ya son absolutas (CDN de Supabase): WhatsApp no
 * resuelve rutas relativas. El resto lo completa `metadataBase` del layout.
 */
export async function metadataDeVista(
  catalogo: Catalogo,
  searchParams: Record<string, string | string[] | undefined>,
  base: Metadata
): Promise<Metadata> {
  const filtros: Filtros = leerFiltros(searchParams);
  if (!hayFiltrosActivos(filtros)) return base;

  const [facetas, { modelo, total }] = await Promise.all([
    getFacetas(catalogo),
    getPortadaDeVista(catalogo, filtros),
  ]);
  const descripcion = describirVista(filtros, catalogo, nombresDeFacetas(facetas));
  const texto =
    total > 0
      ? `${total} ${total === 1 ? "artículo" : "artículos"} en ${CATALOGOS[catalogo].nombre}. Elige y cotiza por WhatsApp con Telas La Jalisciense.`
      : `${CATALOGOS[catalogo].nombre} de Telas La Jalisciense, en Fresnillo. Cotiza por WhatsApp.`;

  const lg = modelo?.foto?.derivados?.lg;
  const imagen = modelo?.foto
    ? (urlDerivado(modelo.foto.derivados, "lg") ?? publicImageUrl(modelo.foto.ruta))
    : null;

  return {
    ...base,
    title: `${descripcion} — Telas La Jalisciense`,
    description: texto,
    openGraph: {
      ...base.openGraph,
      title: descripcion,
      description: texto,
      // La ruta FIJA del catálogo (/merceria, /telas), no la de la portada:
      // Next reduce una og:url con ruta "/" a solo el dominio y se come el
      // querystring. /merceria pinta lo mismo que la portada.
      url: `${CATALOGOS[catalogo].ruta}?${aQuerystring(filtros)}`,
      siteName: "Telas La Jalisciense",
      locale: "es_MX",
      type: "website",
      ...(imagen
        ? {
            images: [
              {
                url: imagen,
                alt: modelo!.nombre,
                ...(lg ? { width: lg.ancho, height: lg.alto } : {}),
              },
            ],
          }
        : {}),
    },
  };
}
