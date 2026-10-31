/**
 * Marca en un texto lo que coincidió con la consulta, para pintarlo en
 * negritas en las sugerencias del buscador. Compara en forma normalizada
 * (sin acentos ni mayúsculas) pero devuelve el texto ORIGINAL partido en
 * trozos: "pedreria" resalta "Pedrería" con su acento.
 *
 * Usa las mismas reglas que el motor, palabra por palabra: el prefijo marca
 * solo lo tecleado ("pedr|ería"); la raíz y el error de dedo marcan la
 * palabra entera ("pedreia" resalta "Pedrería"), porque ahí no hay un
 * pedazo exacto que señalar.
 */
import { distancia, palabrasDeConsulta, raiz } from "@/lib/busqueda/normalizar";

export type Trozo = { texto: string; marcado: boolean };

const DIACRITICOS = /\p{M}/gu;

/** Cuántas letras de `w` marcar para la palabra de consulta `q` (0 = ninguna). */
function cuantoMarcar(q: string, w: string): number {
  if (w.startsWith(q)) return q.length;
  if (raiz(q) === raiz(w)) return w.length;
  if (q.length >= 4 && w.length >= 3) {
    const maximo = q.length >= 7 ? 2 : 1;
    if (distancia(q, w, maximo) <= maximo) return w.length;
  }
  return 0;
}

export function resaltar(texto: string, consulta: string): Trozo[] {
  // Texto normalizado letra por letra, recordando de qué letra original vino
  // cada una: así un rango en la forma normalizada se traduce de vuelta.
  let normal = "";
  const origen: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    const n = texto[i].normalize("NFD").replace(DIACRITICOS, "").toLowerCase();
    const c = /^[a-z0-9]+$/.test(n) ? n : " ";
    for (const letra of c) {
      normal += letra;
      origen.push(i);
    }
  }

  const consultas = palabrasDeConsulta(consulta);
  const marcadas = new Array<boolean>(texto.length).fill(false);
  for (const m of normal.matchAll(/[a-z0-9]+/g)) {
    const w = m[0];
    const largo = Math.max(0, ...consultas.map((q) => cuantoMarcar(q, w)));
    for (let j = m.index; j < m.index + largo; j++) marcadas[origen[j]] = true;
  }

  const trozos: Trozo[] = [];
  for (let i = 0; i < texto.length; i++) {
    const ultimo = trozos[trozos.length - 1];
    if (ultimo && ultimo.marcado === marcadas[i]) ultimo.texto += texto[i];
    else trozos.push({ texto: texto[i], marcado: marcadas[i] });
  }
  return trozos;
}
