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

/** Lo que el catálogo necesita para pintar el velo sobre una foto. */
export type MascaraFoto = { ruta: string; generado_en: string };

/** Una máscara encendida junto con la foto a la que pertenece. */
export type FilaMascaraConFoto = Pick<
  FilaMascara,
  "ruta_sm" | "fuente_generado_en" | "generado_en"
> & {
  foto: { variante_id: string; ruta: string; derivados: { generado_en?: string } | null } | null;
};

/** Estado del fondo blanco para una lectura del catálogo. */
export type EstadoFondoBlanco = {
  activo: boolean;
  /** Por `claveFoto`. Es un objeto porque `unstable_cache` guarda JSON: un Map llegaría vacío. */
  mascaras: Record<string, MascaraFoto>;
};

export const FONDO_BLANCO_APAGADO: EstadoFondoBlanco = { activo: false, mascaras: {} };

/**
 * Identifica una foto con lo que ya traen la vista y la tabla `foto`. La vista
 * solo expone la ruta de `foto_principal`, no su id, y `unique (variante_id, ruta)`
 * garantiza que el par no se repite. Empatar por posición, en cambio, le pintaría
 * a una foto la máscara de otra en cuanto alguien reordene o excluya.
 */
export function claveFoto(varianteId: string, ruta: string): string {
  return `${varianteId}|${ruta}`;
}

/** El interruptor general solo está prendido con un `true` explícito. */
export function interruptorEncendido(valor: unknown): boolean {
  return (valor as { activo?: unknown } | null)?.activo === true;
}

/** Indexa las máscaras encendidas, dejando fuera las vencidas: esas fotos se ven originales. */
export function indiceDeMascaras(filas: FilaMascaraConFoto[]): Record<string, MascaraFoto> {
  const indice: Record<string, MascaraFoto> = {};
  for (const fila of filas) {
    if (!fila.foto) continue;
    if (!mascaraVigente(fila.fuente_generado_en, fila.foto.derivados?.generado_en)) continue;
    indice[claveFoto(fila.foto.variante_id, fila.foto.ruta)] = {
      ruta: fila.ruta_sm,
      generado_en: fila.generado_en,
    };
  }
  return indice;
}

/** La máscara de una foto, si la tiene. */
export function mascaraDe(
  mascaras: Record<string, MascaraFoto>,
  varianteId: string,
  ruta: string | null | undefined
): MascaraFoto | null {
  return ruta ? (mascaras[claveFoto(varianteId, ruta)] ?? null) : null;
}
