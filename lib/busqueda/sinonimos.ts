/**
 * Cómo pide las cosas la clientela → cómo se llaman en el catálogo.
 * ===========================================================================
 * Diccionario EDITABLE: la llave es lo que alguien teclea y el valor, las
 * palabras o frases del catálogo que también debe encontrar. Se escribe con
 * acentos y como se diga; todo pasa por `normalizar` y `raiz` al cargarse, así
 * que "Botón", "boton" y "botones" son la misma llave.
 *
 * Una frase ("piedra suelta") casa cuando TODAS sus palabras están en el mismo
 * campo del producto (su nombre, su categoría, su sección o su color).
 *
 * La relación es de ida: "cristal" encuentra la piedra suelta, pero buscar
 * "piedra suelta" no trae todo lo que diga "cristal". Si se quiere de ida y
 * vuelta, se escriben las dos llaves (como oro ↔ dorado).
 *
 * ✍️ Para Cynthia y Carlo: aquí van las palabras con que la clientela pide las
 * cosas en el mostrador o por WhatsApp. Agregar una línea basta; las pruebas
 * de `motor.test.ts` cuidan que lo existente siga funcionando.
 */
import { normalizar, raiz, tokens } from "@/lib/busqueda/normalizar";

export const SINONIMOS: Readonly<Record<string, readonly string[]>> = {
  // Cristalería = la piedra suelta, a granel.
  cristal: ["piedra suelta", "cristalería"],
  cristalería: ["piedra suelta"],
  chatón: ["pedrería"],
  strass: ["pedrería"],
  estrás: ["pedrería"],
  listón: ["cinta"],
  dorado: ["oro"],
  dorada: ["oro"],
  oro: ["dorado"],
  plateado: ["plata"],
  plateada: ["plata"],
  plata: ["plateado"],
  encaje: ["guipiur", "tul bordado"],
  botón: ["botones"],
  aplique: ["aplicación"],
  cremallera: ["cierre"],
  zipper: ["cierre"],
  brasier: ["copa"],
};

/** Llave normalizada → frases (cada una, sus palabras ya normalizadas). */
function compilar(dic: Readonly<Record<string, readonly string[]>>): Map<string, string[][]> {
  const mapa = new Map<string, string[][]>();
  for (const [llave, valores] of Object.entries(dic)) {
    const k = raiz(normalizar(llave));
    const frases = mapa.get(k) ?? [];
    for (const v of valores) {
      const palabras = tokens(v);
      if (palabras.length) frases.push(palabras);
    }
    mapa.set(k, frases);
  }
  return mapa;
}

const COMPILADO = compilar(SINONIMOS);

/** Frases que también cuentan para una palabra de la consulta (ya normalizada). */
export function sinonimosDe(palabra: string): string[][] {
  return COMPILADO.get(raiz(palabra)) ?? [];
}
