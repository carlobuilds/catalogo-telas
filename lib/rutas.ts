/**
 * ¿Es una herramienta interna (admin de la tienda, revisión de catálogo)?
 * Ahí no van los elementos de vitrina: cabecera con cesta, barra inferior,
 * cesta y la guía para clientes — la guía incluso se abría SOLA a los 3 s
 * encima del formulario de captura.
 *
 * Compara SEGMENTOS completos: "/administracion-de-telas" no es interna.
 */
export function esRutaInterna(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/(admin|revision)(\/|$)/.test(pathname);
}
