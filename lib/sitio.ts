/**
 * Dirección pública del sitio, sin barra final. La usan los metadatos
 * (`metadataBase`, og:url), `robots.txt` y `sitemap.xml`.
 *
 * En producción hay que definir NEXT_PUBLIC_SITE_URL con el dominio real.
 * Mientras no esté, en Vercel se usa su variable de sistema con el dominio de
 * producción (`VERCEL_PROJECT_PRODUCTION_URL`, sin protocolo): sin ella, la
 * og:url de cada link compartido decía "localhost:3000" y Facebook/WhatsApp
 * la toman como la dirección canónica. En local cae al dev server. Si la
 * variable trae basura, `new URL` (en app/layout.tsx) truena en el build a
 * propósito: es preferible a publicar enlaces sin miniatura.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/+$/, "");
