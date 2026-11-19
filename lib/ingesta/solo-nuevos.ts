/**
 * Qué hace `pnpm ingest --upload` con una fila del CSV, según lo que ya existe
 * en producción.
 *
 * Por qué existe: la subida original hacía `upsert` en todo. Si una fila
 * chocaba con algo ya capturado (mismo slug de producto, mismo SKU o mismo
 * color dentro del producto, mismo archivo en el bucket), lo SOBRESCRIBÍA:
 * nombre y categoría del producto, el precio (a null si la celda venía vacía),
 * la existencia, y la foto ya recortada en /admin. Para capturar telas nuevas
 * eso es una trampa: basta un slug repetido para borrar horas de captura.
 *
 * Por eso el modo por defecto es "solo-nuevos": crea lo que no existe y NUNCA
 * toca lo que ya estaba antes de esta corrida. Lo que ya existía se reporta y
 * la fila se salta; si de verdad se quiere reescribir, hay que pedirlo con
 * `--actualizar`.
 *
 * Esta función es pura (sin red ni BD) para poder probarla: el script lee el
 * estado de cada fila y aquí se decide qué escribir ANTES de escribir nada,
 * así una fila saltada no deja un color vacío creado a medias.
 */

export type ModoIngesta = "solo-nuevos" | "actualizar";

/**
 * - "no": no existe.
 * - "previa": existía antes de esta corrida (lo capturó alguien: intocable en
 *   solo-nuevos).
 * - "nueva": la creó ESTA corrida con una fila anterior (otra toma del mismo
 *   producto nuevo): se reutiliza.
 */
export type Existencia = "no" | "previa" | "nueva";

export type EstadoFila = {
  tela: Existencia;
  variante: Existencia;
  /** El archivo ya está en el bucket con esa ruta. */
  archivoEnBucket: boolean;
};

export type DecisionFila =
  | {
      accion: "escribir";
      tela: "crear" | "reusar" | "actualizar";
      variante: "crear" | "reusar" | "actualizar";
      /** Si la subida al bucket puede reemplazar un archivo existente. */
      reemplazarArchivo: boolean;
    }
  | { accion: "saltar"; motivo: string };

export function decidirFila(modo: ModoIngesta, e: EstadoFila): DecisionFila {
  if (modo === "actualizar") {
    // El comportamiento original, pedido explícitamente. Lo que esta misma
    // corrida ya escribió se reusa: reescribirlo con cada toma no cambia nada.
    const accion = (x: Existencia) => (x === "no" ? "crear" : x === "nueva" ? "reusar" : "actualizar");
    return {
      accion: "escribir",
      tela: accion(e.tela),
      variante: accion(e.variante),
      reemplazarArchivo: true,
    };
  }

  if (e.variante === "previa") {
    return {
      accion: "saltar",
      motivo:
        "ese color/código ya existía en el catálogo; edítalo en /admin " +
        "(o corre con --actualizar si de verdad quieres reescribirlo)",
    };
  }
  if (e.archivoEnBucket) {
    return {
      accion: "saltar",
      motivo:
        "ese archivo ya está en el bucket; súbelo con otro nombre o desde /admin " +
        "(reemplazarlo borraría el recorte ya curado)",
    };
  }

  return {
    accion: "escribir",
    // Un producto que ya existía se REUSA para colgarle el color nuevo, pero
    // sin tocarle nombre ni categoría.
    tela: e.tela === "no" ? "crear" : "reusar",
    variante: e.variante === "no" ? "crear" : "reusar",
    reemplazarArchivo: false,
  };
}
