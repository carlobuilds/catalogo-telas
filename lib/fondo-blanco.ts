/**
 * Reglas del fondo blanco que no necesitan sharp, para poder usarlas desde el
 * catálogo sin arrastrar el procesamiento de imágenes al bundle de la página.
 * El cálculo de la máscara vive en `lib/images/mascara.ts`.
 */

/** Fila de `foto_mascara` (sección 17 del SQL). */
export type FilaMascara = {
  foto_id: string;
  ruta_sm: string;
  ruta_md: string | null;
  ancho: number;
  alto: number;
  activa: boolean;
  nivel_fondo: number;
  pct_fondo: number;
  pct_transicion: number;
  fuente_generado_en: string;
  generado_en: string;
};

/**
 * ¿La máscara sigue correspondiendo a la foto? Compara el `generado_en` de los
 * derivados con la copia que se guardó al generarla. `resubir-fotos`,
 * `procesar-fotos-crop` y la ingesta reescriben maestro y derivados en las
 * mismas rutas: sin esto, una máscara vieja se pintaría sobre un encuadre
 * nuevo y taparía el producto. Ante la duda, no: se ve la foto original.
 */
export function mascaraVigente(
  fuenteGeneradoEn: string | null | undefined,
  generadoEnFoto: string | null | undefined
): boolean {
  return !!fuenteGeneradoEn && fuenteGeneradoEn === generadoEnFoto;
}

/**
 * ¿Una foto entra encendida al correr el backfill? Solo las subidas hasta la
 * fecha de corte: las ya subidas quedan encendidas y las nuevas apagadas, por
 * decisión de la tienda. La fecha es obligatoria porque "no tiene fila" no
 * distingue una foto vieja de una recién subida por `pnpm ingest` o de una cuyo
 * `after()` falló. Una fecha ilegible da apagada.
 */
export function activaSegunFecha(createdAt: string, activarHasta: Date): boolean {
  const creada = Date.parse(createdAt);
  return !Number.isNaN(creada) && creada <= activarHasta.getTime();
}

/**
 * Categorías que se fotografían dentro de un contenedor transparente: cuencos de
 * vidrio y bolsitas. Lo negro que se ve a través de ellos es parte de la foto.
 */
const CATEGORIAS_CONTENEDOR = new Set(["piedra-suelta", "bolsa-de-piedra"]);

export function esContenedor(categoria: string | null | undefined): boolean {
  return !!categoria && CATEGORIAS_CONTENEDOR.has(categoria);
}
