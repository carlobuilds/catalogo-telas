/**
 * Atajos de teclado del admin, al estilo SICAR: la dueña ya trae en los dedos
 * "F2 nuevo artículo", "F10 guardar". Este archivo es la ÚNICA fuente — el
 * listener (`useAtajos`), las pistas del menú y la ayuda (`?`) leen de aquí.
 *
 * Se evitan a propósito F1 (ayuda del navegador), F5 (recargar: perdería lo
 * capturado), F11 (pantalla completa) y F12 (herramientas de desarrollo).
 *
 * Todo atajo tiene también un botón visible: en iPad y en Mac la fila de F
 * no es cómoda (o no existe), así que el teclado es un atajo, nunca el único
 * camino.
 */

export type AccionAtajo =
  | "nuevo"
  | "buscar"
  | "entradas"
  | "guardar-otro"
  | "guardar"
  | "cancelar"
  | "ayuda";

export interface Atajo {
  accion: AccionAtajo;
  /** Como se le muestran a la persona, en el orden en que se mencionan. */
  teclas: readonly string[];
  descripcion: string;
}

export const ATAJOS: readonly Atajo[] = [
  { accion: "nuevo", teclas: ["F2"], descripcion: "Nuevo artículo" },
  { accion: "buscar", teclas: ["F3"], descripcion: "Buscar un artículo" },
  { accion: "entradas", teclas: ["F4"], descripcion: "Entradas y salidas de inventario" },
  { accion: "guardar-otro", teclas: ["F9"], descripcion: "Guardar y agregar otro color" },
  { accion: "guardar", teclas: ["F10", "Ctrl + S"], descripcion: "Guardar" },
  { accion: "cancelar", teclas: ["Esc"], descripcion: "Cancelar la captura" },
  { accion: "ayuda", teclas: ["?"], descripcion: "Ver esta lista de atajos" },
];

/** La primera tecla de una acción, para pintarla junto a su botón ("F2"). */
export function teclaDe(accion: AccionAtajo): string {
  return ATAJOS.find((a) => a.accion === accion)?.teclas[0] ?? "";
}

const TECLAS_DE_FUNCION: Partial<Record<string, AccionAtajo>> = {
  F2: "nuevo",
  F3: "buscar",
  F4: "entradas",
  F9: "guardar-otro",
  F10: "guardar",
};

/** Lo que importa de un `KeyboardEvent`, para poder probarlo sin DOM. */
export interface TeclaPulsada {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/**
 * Qué acción dispara una tecla, o `null`.
 *
 * `escribiendo` = el foco está en un campo de texto. Las teclas F y Ctrl+S
 * funcionan IGUAL dentro de un campo —en SICAR se captura el precio y se da
 * F10 sin soltar el campo—, pero `?` no: ahí es un carácter que se escribe.
 *
 * Con Alt no se dispara nada: en teclados latinoamericanos en Windows,
 * AltGr llega como Ctrl+Alt y es como se escribe la @ de un correo.
 */
export function accionDeTecla(e: TeclaPulsada, escribiendo: boolean): AccionAtajo | null {
  if (e.altKey) return null;
  const conModificador = e.ctrlKey || e.metaKey;

  if (!conModificador && !e.shiftKey && TECLAS_DE_FUNCION[e.key]) {
    return TECLAS_DE_FUNCION[e.key] ?? null;
  }
  if (conModificador && !e.shiftKey && e.key.toLowerCase() === "s") return "guardar";
  if (conModificador) return null;
  if (e.key === "Escape") return "cancelar";
  if (e.key === "?" && !escribiendo) return "ayuda";
  return null;
}
