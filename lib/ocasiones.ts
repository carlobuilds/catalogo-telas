/**
 * Etiquetas de "Ocasión y estilo" en la ficha.
 *
 * La vista `catalogo_telas` entrega los casos de uso y las oportunidades como
 * SLUGS (`xv-anos`, `dia-de-muertos`). Pintarlos tal cual —aunque sea con
 * `capitalize`— daba "Xv Anos" y "Dia De Muertos": sin acentos ni ñ. El nombre
 * bueno ("XV años", "Día de Muertos") vive en las tablas `caso_uso` y
 * `oportunidad`, y se busca ahí.
 */

/** slug → nombre, de `caso_uso` y `oportunidad` juntos. */
export type NombresDeOcasion = Record<string, string>;

export function etiquetaDeOcasion(slug: string, nombres: NombresDeOcasion): string {
  const nombre = nombres[slug];
  if (nombre) return nombre;
  // Sin el nombre (la lectura falló o es un slug nuevo): algo legible, nunca
  // el slug crudo con guiones.
  const texto = slug.replace(/-/g, " ").trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
