import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/sitio";

/**
 * /robots.txt — el catálogo es público; el panel, la revisión y la API no.
 * Las páginas de /admin y /revision ya llevan `noindex` y piden sesión: esto
 * solo evita que los buscadores pierdan tiempo tocando su puerta.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/revision", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
