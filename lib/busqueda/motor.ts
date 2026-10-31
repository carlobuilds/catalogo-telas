/**
 * Motor de búsqueda del catálogo, en JS sobre el índice en memoria.
 * ===========================================================================
 * Por qué aquí y no en SQL: `buscar_telas` no existe en producción y el ILIKE
 * de respaldo distinguía acentos. El catálogo es chico, así que buscar en JS
 * es instantáneo, se prueba con vitest y no pide migración.
 *
 * Cómo puntúa: cada palabra de la consulta se compara contra cada campo del
 * modelo y se queda con su MEJOR coincidencia (tipo × peso del campo). El
 * puntaje del modelo es la suma. Todas las palabras tienen que coincidir en
 * algo; si así no sale nada, se relaja a "la mayoría" y el resultado se marca
 * `aproximado` para poder decírselo a quien busca.
 */
import type { Catalogo } from "@/lib/catalogos";
import { type CampoBusqueda, type ModeloIndice, porNombre } from "@/lib/busqueda/indice";
import { facetasDeIndice, type Faceta } from "@/lib/busqueda/facetas";
import { compacto, distancia, palabrasDeConsulta, raiz, tokens } from "@/lib/busqueda/normalizar";
import { sinonimosDe } from "@/lib/busqueda/sinonimos";

/** Exacta > prefijo > subcadena > difusa. */
const PUNTOS = { exacta: 1, prefijo: 0.8, subcadena: 0.5, difusa: 0.45 } as const;

/** Lo que pesa coincidir en cada campo: el nombre y el código dicen más que el color. */
const PESOS: Record<CampoBusqueda, number> = {
  nombre: 3,
  sku: 3,
  categoria: 2,
  seccion: 2,
  color: 2,
};
const CAMPOS = Object.keys(PESOS) as CampoBusqueda[];

/** Un sinónimo vale casi lo mismo que la palabra: la tienda los puso a propósito. */
const FACTOR_SINONIMO = 0.9;

/** Teclear el código exacto de un producto lo pone primero, pase lo que pase. */
const BONO_SKU_EXACTO = 100;

/**
 * Qué tan bien casa una palabra de la consulta con una del catálogo.
 * `esUltima`: la última palabra se está escribiendo todavía, así que "boto"
 * cuenta como prefijo de "botones"; en medio de la frase ya no.
 */
function coincidencia(q: string, w: string, esUltima: boolean): number {
  if (q === w || raiz(q) === raiz(w)) return PUNTOS.exacta;
  if (esUltima && w.startsWith(q)) return PUNTOS.prefijo;
  if (q.length >= 3 && w.includes(q)) return PUNTOS.subcadena;
  // Errores de dedo: uno en palabras de 4 a 6 letras, dos de 7 en adelante.
  // Nunca contra palabras de 1–2 letras ("a", "pz"): todo estaría "cerca".
  if (q.length >= 4 && w.length >= 3) {
    const maximo = q.length >= 7 ? 2 : 1;
    if (distancia(q, w, maximo) <= maximo) return PUNTOS.difusa;
    if (esUltima && q.length >= 5 && w.length > q.length && distancia(q, w.slice(0, q.length), maximo) <= maximo) {
      return PUNTOS.difusa;
    }
  }
  return 0;
}

function mejorEnCampo(q: string, palabras: readonly string[], esUltima: boolean): number {
  let mejor = 0;
  for (const w of palabras) {
    const p = coincidencia(q, w, esUltima);
    if (p > mejor) mejor = p;
    if (mejor === PUNTOS.exacta) break;
  }
  return mejor;
}

type Campos = Partial<Record<CampoBusqueda, readonly string[]>>;

/** Mejor puntaje de UNA palabra de la consulta contra todos los campos. */
function puntosDePalabra(q: string, campos: Campos, skusCompactos: readonly string[], esUltima: boolean): number {
  let mejor = 0;
  for (const campo of CAMPOS) {
    const palabras = campos[campo];
    if (!palabras?.length) continue;
    mejor = Math.max(mejor, mejorEnCampo(q, palabras, esUltima) * PESOS[campo]);
  }

  // Un código se teclea con o sin guiones: "bnk2030" es prefijo de "bnk203068".
  for (const s of skusCompactos) {
    const p =
      s === q ? PUNTOS.exacta : s.startsWith(q) ? PUNTOS.prefijo : q.length >= 3 && s.includes(q) ? PUNTOS.subcadena : 0;
    mejor = Math.max(mejor, p * PESOS.sku);
  }

  // Sinónimos: la frase entera tiene que estar en un mismo campo.
  for (const frase of sinonimosDe(q)) {
    for (const campo of CAMPOS) {
      const palabras = campos[campo];
      if (!palabras?.length) continue;
      const casa = frase.every((p) => palabras.some((w) => w === p || raiz(w) === raiz(p)));
      if (casa) mejor = Math.max(mejor, FACTOR_SINONIMO * PESOS[campo]);
    }
  }
  return mejor;
}

type Puntuado = { puntos: number; coinciden: number };

function puntuar(palabras: readonly string[], campos: Campos, skusCompactos: readonly string[]): Puntuado {
  let puntos = 0;
  let coinciden = 0;
  palabras.forEach((q, i) => {
    const p = puntosDePalabra(q, campos, skusCompactos, i === palabras.length - 1);
    if (p > 0) coinciden += 1;
    puntos += p;
  });
  return { puntos, coinciden };
}

export type ResultadoBusqueda = {
  /** tela_id en orden de relevancia; empate por nombre. */
  ids: string[];
  /** Puntaje de cada id, para quien quiera reordenar sin perder la relevancia. */
  puntajes: Record<string, number>;
  /** Los que casaron con un SKU EXACTO: van primero aunque no tengan precio. */
  skuExacto: string[];
  /** No hubo nada con TODAS las palabras: esto es lo que tiene la mayoría. */
  aproximado: boolean;
};

const VACIO: ResultadoBusqueda = { ids: [], puntajes: {}, skuExacto: [], aproximado: false };

/**
 * Busca `consulta` en los modelos del índice. Con `catalogo`, solo en ese.
 * Una consulta vacía (o solo de signos) no encuentra nada: quien no escribió
 * nada no está buscando, y el listado normal ya lo cubre.
 */
export function buscarModelos(
  indice: readonly ModeloIndice[],
  consulta: string,
  { catalogo }: { catalogo?: Catalogo } = {}
): ResultadoBusqueda {
  const palabras = palabrasDeConsulta(consulta);
  if (palabras.length === 0) return VACIO;
  const codigo = compacto(consulta);

  const candidatos = catalogo ? indice.filter((m) => m.catalogo === catalogo) : indice;
  const puntuados = candidatos.map((m) => {
    const r = puntuar(palabras, m.campos, m.skusCompactos);
    const exacto = codigo.length > 0 && m.skusCompactos.includes(codigo);
    return { m, ...r, exacto, puntos: r.puntos + (exacto ? BONO_SKU_EXACTO : 0) };
  });

  let elegidos = puntuados.filter((p) => p.exacto || p.coinciden === palabras.length);
  let aproximado = false;
  if (elegidos.length === 0 && palabras.length > 1) {
    const minimo = Math.ceil(palabras.length / 2);
    elegidos = puntuados.filter((p) => p.coinciden >= minimo);
    aproximado = elegidos.length > 0;
  }

  elegidos.sort((a, b) => b.puntos - a.puntos || porNombre(a.m, b.m));
  return {
    ids: elegidos.map((p) => p.m.tela_id),
    puntajes: Object.fromEntries(elegidos.map((p) => [p.m.tela_id, p.puntos])),
    skuExacto: elegidos.filter((p) => p.exacto).map((p) => p.m.tela_id),
    aproximado,
  };
}

export type GruposSugerencia = {
  secciones: Faceta[];
  categorias: Faceta[];
  colores: Faceta[];
};

/**
 * Secciones, categorías y colores cuyo NOMBRE casa con la consulta, con
 * cuántos productos tiene cada uno en el catálogo. Son los atajos del
 * buscador: "pedre" ofrece la sección Pedrería y sus tiras; "cristal", la
 * Cristalería, la piedra suelta y el color Cristal.
 */
export function sugerirGrupos(
  indice: readonly ModeloIndice[],
  consulta: string,
  catalogo: Catalogo,
  maximo = 4
): GruposSugerencia {
  const palabras = palabrasDeConsulta(consulta);
  if (palabras.length === 0) return { secciones: [], categorias: [], colores: [] };

  const facetas = facetasDeIndice([...indice], catalogo);
  const elegir = (lista: Faceta[], campo: CampoBusqueda) =>
    lista
      .map((f) => ({ f, ...puntuar(palabras, { [campo]: tokens(f.nombre) }, []) }))
      .filter((p) => p.coinciden === palabras.length)
      .sort((a, b) => b.puntos - a.puntos || b.f.conteo - a.f.conteo)
      .slice(0, maximo)
      .map((p) => p.f);

  return {
    secciones: elegir(facetas.secciones, "seccion"),
    categorias: elegir(facetas.categorias, "categoria"),
    colores: elegir(facetas.colores, "color"),
  };
}
