/**
 * Resultado de una server action que se llama desde un formulario de captura.
 *
 * Los errores esperables (SKU repetido, número inválido) REGRESAN como valor
 * en vez de lanzarse: una excepción termina en `app/error.tsx`, que tapa la
 * pantalla entera, y en producción Next además borra el mensaje — la tienda
 * perdía lo que había escrito sin saber por qué. Mismo contrato que usa
 * `/revision` (`app/revision/actions.ts`).
 */
export type EstadoGuardado = { ok: true } | { ok: false; error: string };

/** Mensaje legible de cualquier cosa que haya lanzado un parser. */
export function mensajeDeError(e: unknown, respaldo = "Datos inválidos."): string {
  return e instanceof Error && e.message ? e.message : respaldo;
}
