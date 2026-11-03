/**
 * "Enter pasa al siguiente campo", como en SICAR. Lógica pura (sin DOM) para
 * poder probarla; el hook `useEnterAvanza` la conecta al formulario.
 *
 * Reglas:
 * - Solo avanza desde campos de UNA línea y desde `<select>`. En un textarea
 *   Enter es salto de renglón, en un botón lo activa y en un input de archivo
 *   abre el selector — ahí no se toca.
 * - `data-enter-propio` excluye un campo que ya hace algo con Enter (un
 *   buscador con lista de resultados, por ejemplo).
 * - En el último campo NO envía: lleva el foco al botón de guardar y la
 *   persona confirma con otro Enter. Un lector de código de barras manda
 *   "código + Enter" y no debe guardar un artículo a medias.
 */

/** Lo que importa de un control de formulario para decidir. */
export interface CampoDescrito {
  /** `tagName` en minúsculas: "input", "select", "textarea", "button"… */
  etiqueta: string;
  /** `type` del input en minúsculas ("" para select/textarea). */
  tipo: string;
  nombre: string;
  marcado: boolean;
  deshabilitado: boolean;
  soloLectura: boolean;
  visible: boolean;
  enterPropio: boolean;
}

/** Inputs de una línea donde Enter, por default, enviaría el form. */
const TIPOS_DE_UNA_LINEA = new Set([
  "",
  "text",
  "search",
  "number",
  "email",
  "tel",
  "url",
  "password",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
]);

/** Inputs que no son campos de captura: nunca reciben el foco al avanzar. */
const TIPOS_QUE_NO_SON_CAMPO = new Set(["hidden", "submit", "button", "reset", "image", "file"]);

/** ¿Enter en este campo debe avanzar al siguiente? */
export function enterAvanzaDesde(c: CampoDescrito): boolean {
  if (c.enterPropio) return false;
  if (c.etiqueta === "select") return true;
  return c.etiqueta === "input" && TIPOS_DE_UNA_LINEA.has(c.tipo);
}

/** ¿Puede este campo recibir el foco al avanzar? */
function esDestino(c: CampoDescrito): boolean {
  if (c.deshabilitado || c.soloLectura || !c.visible) return false;
  if (c.etiqueta === "select" || c.etiqueta === "textarea") return true;
  return c.etiqueta === "input" && !TIPOS_QUE_NO_SON_CAMPO.has(c.tipo);
}

/**
 * Índice del campo que sigue a `actual`, o `null` si `actual` es el último.
 *
 * De un grupo de radios solo cuenta UNO (el marcado, o el primero si ninguno
 * lo está): entre radios se mueve con las flechas, y dar Enter por cada
 * opción sería absurdo.
 */
export function siguienteCampo(campos: readonly CampoDescrito[], actual: number): number | null {
  const radioQueCuenta = new Map<string, number>();
  campos.forEach((c, i) => {
    if (c.etiqueta !== "input" || c.tipo !== "radio" || !esDestino(c)) return;
    if (!radioQueCuenta.has(c.nombre) || c.marcado) radioQueCuenta.set(c.nombre, i);
  });

  for (let i = actual + 1; i < campos.length; i++) {
    const c = campos[i];
    if (!esDestino(c)) continue;
    if (c.tipo === "radio" && radioQueCuenta.get(c.nombre) !== i) continue;
    return i;
  }
  return null;
}
