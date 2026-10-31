/**
 * Texto → forma comparable, para que la búsqueda no dependa de cómo se teclee.
 * ===========================================================================
 * La clientela escribe desde el celular: sin acentos, con mayúsculas al azar,
 * en plural o con un dedazo. Todo lo que se compara pasa por aquí, tanto la
 * consulta como el catálogo, así que basta con que las dos formas coincidan.
 */

const DIACRITICOS = /\p{M}/gu;

/**
 * "Pedrería · 25 PZ" → "pedreria 25 pz". NFD separa la letra de su acento y
 * luego se tira el acento; todo lo que no es letra o número es un separador.
 * La ñ queda como n, igual en los dos lados.
 */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokens(texto: string | null | undefined): string[] {
  const n = normalizar(texto);
  return n ? n.split(" ") : [];
}

/** "BNK-2030-68" → "bnk203068": un código se teclea con o sin guiones. */
export function compacto(texto: string | null | undefined): string {
  return normalizar(texto).replace(/ /g, "");
}

/**
 * Raíz para comparar singular con plural: botones/botón, flores/flor,
 * piedras/piedra. Solo en palabras de 4 letras o más y sin dejar raíces de
 * menos de 3, para no tocar "oro", "pz" ni "mm".
 *
 * También se quita la -e final: sin eso "broches" (→ "broch") y "broche" no
 * casarían, y lo mismo pasa con encaje/encajes, cierre/cierres, verde/verdes.
 * No es un lematizador: solo tiene que dar la MISMA raíz a las dos formas.
 */
export function raiz(palabra: string): string {
  if (palabra.length < 4) return palabra;
  if (palabra.endsWith("es") && palabra.length - 2 >= 3) return palabra.slice(0, -2);
  if (palabra.endsWith("s") && palabra.length - 1 >= 3) return palabra.slice(0, -1);
  if (palabra.endsWith("e") && palabra.length - 1 >= 3) return palabra.slice(0, -1);
  return palabra;
}

/**
 * Palabras que no distinguen un producto de otro. Se quitan de la consulta
 * porque todas las palabras deben coincidir: "tira con oro" no debe fallar
 * porque el nombre no dice "con".
 */
const VACIAS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "con", "para", "en", "por",
  "un", "una", "unos", "unas", "a", "al", "o",
]);

/**
 * Palabras de una consulta, sin las vacías. Si la consulta era SOLO palabras
 * vacías se devuelven tal cual: alguien que busca "de" algo quiere encontrar.
 */
export function palabrasDeConsulta(consulta: string): string[] {
  const todas = tokens(consulta);
  const utiles = todas.filter((t) => !VACIAS.has(t));
  return utiles.length ? utiles : todas;
}

/**
 * Distancia Damerau-Levenshtein (alineación óptima): cuántas letras hay que
 * cambiar, quitar, poner o voltear de lugar. "pedreia"→"pedreria" = 1,
 * "botnoes"→"botones" = 1. Corta en cuanto se pasa de `maximo`: solo importa
 * saber si está cerca, no cuánto exactamente.
 */
export function distancia(a: string, b: string, maximo = Infinity): number {
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1;
  const filas: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    filas.push([i]);
    let minimoFila = i;
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        filas[0][j] = j;
        continue;
      }
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(filas[i - 1][j] + 1, filas[i][j - 1] + 1, filas[i - 1][j - 1] + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, filas[i - 2][j - 2] + 1);
      }
      filas[i][j] = d;
      if (d < minimoFila) minimoFila = d;
    }
    if (i > 0 && minimoFila > maximo) return maximo + 1;
  }
  return filas[a.length][b.length];
}
