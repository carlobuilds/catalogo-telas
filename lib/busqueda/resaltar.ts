/**
 * Marca en un texto lo que coincidió con la consulta, para pintarlo en
 * negritas en las sugerencias del buscador. Compara en forma normalizada
 * (sin acentos ni mayúsculas) pero devuelve el texto ORIGINAL partido en
 * trozos: "pedreria" resalta "Pedrería" con su acento.
 */
import { palabrasDeConsulta, raiz } from "@/lib/busqueda/normalizar";

export type Trozo = { texto: string; marcado: boolean };

const DIACRITICOS = /\p{M}/gu;

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

  const marcadas = new Array<boolean>(texto.length).fill(false);
  for (const q of palabrasDeConsulta(consulta)) {
    // Se prueba la palabra y luego su raíz: "botones" resalta "Botón".
    for (const forma of new Set([q, raiz(q)])) {
      let hubo = false;
      for (let k = normal.indexOf(forma); k !== -1; k = normal.indexOf(forma, k + 1)) {
        // Solo al inicio de una palabra: resaltar "oro" dentro de "tesoro" confunde.
        if (k > 0 && normal[k - 1] !== " ") continue;
        for (let j = k; j < k + forma.length; j++) marcadas[origen[j]] = true;
        hubo = true;
      }
      if (hubo) break;
    }
  }

  const trozos: Trozo[] = [];
  for (let i = 0; i < texto.length; i++) {
    const ultimo = trozos[trozos.length - 1];
    if (ultimo && ultimo.marcado === marcadas[i]) ultimo.texto += texto[i];
    else trozos.push({ texto: texto[i], marcado: marcadas[i] });
  }
  return trozos;
}
