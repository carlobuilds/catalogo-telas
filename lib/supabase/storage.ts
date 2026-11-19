import type { DerivadosFoto } from "@/lib/types";

const BUCKET = "telas";

/**
 * Construye la URL pública de una foto a partir de su ruta relativa
 * dentro del bucket `telas`. La BD guarda solo la ruta (ej. "chifon-lunares/azul-1.jpg").
 */
export function publicImageUrl(ruta: string | null | undefined): string | null {
  if (!ruta) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const clean = ruta.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${clean}`;
}

/** Orden canónico de los tamaños derivados, de menor a mayor. */
export const TAMANOS_DERIVADOS = ["sm", "md", "lg"] as const;
export type TamanoDerivado = (typeof TAMANOS_DERIVADOS)[number];

/**
 * Ruta dentro del bucket del derivado WebP de una foto original.
 * "chifon-lunares/azul-1.jpg" → "derivados/md/chifon-lunares/azul-1.webp".
 * El prefijo `derivados/` se puede borrar completo sin tocar originales.
 */
export function rutaDerivado(ruta: string, tamano: TamanoDerivado): string {
  return `derivados/${tamano}/${baseDeRuta(ruta)}.webp`;
}

/**
 * Lo que un original comparte con sus derivados: la ruta sin barra inicial ni
 * extensión. "a.jpg" y "a.webp" dan lo mismo, así que sus derivados son LOS
 * MISMOS archivos (por eso `rutasQueSePuedenBorrar` existe).
 */
export function baseDeRuta(ruta: string): string {
  return ruta.replace(/^\/+/, "").replace(/\.[^./]+$/, "");
}

/** Las tres rutas derivadas de un original (para borrarlas junto con él). */
export function rutasDerivados(ruta: string): string[] {
  return TAMANOS_DERIVADOS.map((t) => rutaDerivado(ruta, t));
}

/** Tamaños de la máscara de fondo blanco (`lib/images/mascara.ts`). */
export const TAMANOS_MASCARA = ["sm", "md"] as const;
export type TamanoMascara = (typeof TAMANOS_MASCARA)[number];

/**
 * Ruta dentro del bucket de la máscara de una foto. Va por id y no por la ruta
 * de la foto, como los derivados, por dos razones: "a.jpg" y "a.png" colisionan
 * en `rutaDerivado`, y `eliminarFoto` puede borrarla sin leer `foto_mascara`, que
 * quizá ni exista todavía. El prefijo `mascaras/` se puede borrar completo sin
 * tocar fotos ni derivados.
 */
export function rutaMascara(fotoId: string, tamano: TamanoMascara): string {
  return `mascaras/${tamano}/${fotoId}.webp`;
}

/** Las rutas de máscara de una foto (para borrarlas junto con ella). */
export function rutasMascara(fotoId: string): string[] {
  return TAMANOS_MASCARA.map((t) => rutaMascara(fotoId, t));
}

/**
 * Qué archivos del bucket se pueden quitar al borrar unas fotos SIN dejar rota
 * ninguna de las que se quedan.
 *
 * Borrar una foto no siempre es dueña de sus archivos:
 *  - Otra fila de `foto` puede apuntar a la MISMA ruta (`foto` solo exige
 *    `unique(variante_id, ruta)`; pasa al mover una foto y re-correr la ingesta).
 *  - "x.jpg" y "x.webp" comparten derivados (`rutaDerivado` quita la
 *    extensión), y la ingesta llegó a subir esas parejas como fotos repetidas.
 * Borrar la "repetida" a ciegas dejaba a la otra sin sus tamaños sm/md/lg.
 *
 * Las máscaras van por id de foto, así que esas siempre se van.
 *
 * @param borradas Fotos cuyas filas se eliminan.
 * @param quedan   Otras fotos que podrían compartir archivos (basta con las
 *                 que tengan la misma base; las demás no estorban).
 */
export function rutasQueSePuedenBorrar(
  borradas: { id: string; ruta: string }[],
  quedan: { ruta: string }[]
): string[] {
  const limpia = (r: string) => r.replace(/^\/+/, "");
  const originalesEnUso = new Set(quedan.map((q) => limpia(q.ruta)));
  const basesEnUso = new Set(quedan.map((q) => baseDeRuta(q.ruta)));

  const rutas = new Set<string>();
  for (const f of borradas) {
    if (!originalesEnUso.has(limpia(f.ruta))) rutas.add(f.ruta);
    if (!basesEnUso.has(baseDeRuta(f.ruta))) {
      for (const d of rutasDerivados(f.ruta)) rutas.add(d);
    }
    for (const m of rutasMascara(f.id)) rutas.add(m);
  }
  return [...rutas];
}

/**
 * Sello de versión de un lote de derivados o de una máscara, para romper caché
 * cuando se vuelven a generar.
 *
 * Las rutas de los derivados son deterministas, así que al re-hornear una foto
 * la URL NO cambia — y Supabase los sirve con `cache-control: max-age=3600`.
 * Sin esto, un visitante que ya cargó el catálogo sigue viendo la imagen vieja
 * hasta una hora. Medido tras la re-subida: la versión cacheada de una tira
 * traía el relleno espejo (banda superior sd 15.24) mientras el CDN ya servía
 * la corregida (sd 0.01).
 *
 * `generado_en` ya lo escribe `procesarFoto` en cada pasada, así que el sello
 * se mueve solo. Si falta, no se agrega nada (URL idéntica a la de antes).
 */
function sello(generadoEn: string | null | undefined): string {
  const t = Date.parse(generadoEn ?? "");
  return Number.isNaN(t) ? "" : `?v=${t}`;
}

/** URL pública de una máscara, con el sello de cuándo se generó. */
export function urlMascara(
  ruta: string | null | undefined,
  generadoEn: string | null | undefined
): string | null {
  const url = publicImageUrl(ruta);
  return url ? `${url}${sello(generadoEn)}` : null;
}

/**
 * Arma el atributo `srcset` con los derivados disponibles usando su ancho
 * REAL (guardado al generarlos; en fotos verticales el ancho no es el lado
 * largo). Devuelve null si no hay ninguno → el caller cae al original.
 */
export function srcsetDerivados(
  derivados: DerivadosFoto | null | undefined
): string | null {
  if (!derivados) return null;
  const v = sello(derivados.generado_en);
  const partes: string[] = [];
  for (const tamano of TAMANOS_DERIVADOS) {
    const d = derivados[tamano];
    const url = d && publicImageUrl(d.ruta);
    if (d && url) partes.push(`${url}${v} ${d.ancho}w`);
  }
  return partes.length > 0 ? partes.join(", ") : null;
}

/** URL del derivado preferido (con fallback en cascada) o null si no hay. */
export function urlDerivado(
  derivados: DerivadosFoto | null | undefined,
  preferido: TamanoDerivado
): string | null {
  if (!derivados) return null;
  const orden: TamanoDerivado[] = [
    preferido,
    ...TAMANOS_DERIVADOS.filter((t) => t !== preferido),
  ];
  const v = sello(derivados.generado_en);
  for (const tamano of orden) {
    const url = publicImageUrl(derivados[tamano]?.ruta);
    if (url) return `${url}${v}`;
  }
  return null;
}

export const STORAGE_BUCKET = BUCKET;
