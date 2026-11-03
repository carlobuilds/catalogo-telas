/**
 * Máscara de fondo blanco (SOLO servidor / scripts — importa sharp).
 *
 * La foto no se altera. La máscara es un VELO blanco con la silueta del producto
 * calada, guardado aparte en `mascaras/`, que el catálogo pinta encima de la
 * foto con `mix-blend-mode: plus-lighter`. Apagarla es no pintar el velo.
 *
 * Por qué no hace falta IA: casi toda la mercería se fotografió sobre negro
 * limpio, y sobre negro cada píxel ya vale `alfa · color`. Basta con medir hasta
 * dónde llega el negro en CADA foto. Un umbral fijo dejaba manchas con la forma
 * de los bloques de compresión: el fondo de una foto medía 9 y el de otra 20.
 *
 * Por qué no hay flood fill desde la orilla: las piezas caladas se quedarían con
 * negro en los huecos. Lo oscuro se vuelve fondo donde sea que esté. Eso tiene
 * dos excepciones, medidas a ojo sobre producción:
 *   - Producto oscuro y mate: sus sombras miden lo mismo que el fondo y la pieza
 *     sale deshecha. Se detecta por contraste y NO se le genera máscara: es
 *     preferible una foto sobre negro que una flor rota.
 *   - Contenedores (cuencos de vidrio, bolsitas): el negro se ve a través de
 *     ellos. Se conserva todo lo que queda dentro de su envolvente convexa.
 *
 * Este módulo nunca escribe en `foto`: `procesarFoto` hace `UPDATE foto` y por
 * eso no se llama desde aquí. Solo escribe en `foto_mascara` y bajo `mascaras/`.
 */
import sharp, { type WebpOptions } from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DerivadosFoto } from "@/lib/types";
import { STORAGE_BUCKET, rutaMascara } from "@/lib/supabase/storage";
import { percentil } from "./recorte";

/** Lado largo al que se analiza. Es el del derivado `sm`, del que sale la máscara. */
export const LADO_ANALISIS = 800;

/** Dos pasadas de blur: quitan el ruido de compresión solo para decidir, nunca de la foto. */
const RADIOS_SUAVIZADO = [2, 1];

/** Fracción del lado corto que se considera orilla al medir el fondo. */
const ANILLO_ORILLA = 0.03;

/**
 * Percentil de la orilla que se toma como nivel de fondo. Alto a propósito: el
 * umbral tiene que quedar por encima del ruido, no de su promedio.
 */
const PERCENTIL_ORILLA = 0.995;

/**
 * Tope del nivel sobre el percentil 90 de la orilla. Una tira o un guipiur que
 * cruzan el marco meten producto en la orilla y disparan el percentil alto:
 * medido sobre producción, 22 de las 192 fotos rechazadas estaban sobre negro y
 * solo tenían ese problema. El percentil 90 no lo ve, y la transición suave
 * absorbe que un fondo disparejo quede un poco por encima del tope.
 */
const HOLGURA_SOBRE_P90 = 12;

/** Por encima de este nivel la foto no está sobre negro y no aplica. */
export const NIVEL_MAXIMO_FONDO = 40;

/**
 * El techo del fondo se busca en el histograma de TODA la foto: partiendo de su
 * cima, se avanza hasta que la densidad cae a esta fracción. La orilla sola no
 * basta porque el centro de la toma suele estar más iluminado: medido sobre
 * producción, una orilla a 4 con el fondo llegando hasta 16 dejaba neblina
 * alrededor de la pieza.
 */
const FRACCION_VALLE = 0.05;

/** Margen sobre el techo del fondo donde empieza a aparecer el producto. */
const MARGEN_SOBRE_FONDO = 2;

/**
 * Tramo de brillo en el que el velo pasa de opaco a transparente. Sale de cada
 * foto: la distancia hasta el primer cuartil del producto. Un tramo fijo de 22
 * lavaba los productos oscuros, porque velo y foto se SUMAN: una flor vino que
 * apenas llega a 70 quedaba casi blanca.
 */
const TRANSICION_MINIMA = 6;
const TRANSICION_MAXIMA = 22;

/**
 * Si queda menos producto que esto, el velo taparía la pieza y en el catálogo
 * saldría un cuadro blanco. Medido el 2026-11-03 sobre las 584 fotos de
 * producción: el producto real más chico ocupa 1.16% de la foto.
 */
export const PRODUCTO_MINIMO_PCT = 0.5;

/**
 * Si queda más producto que esto no es una pieza sobre negro sino una tela
 * oscura a cuadro completo, cuya textura saldría a manchas. Medido el mismo día:
 * el producto real más grande ocupa 33.2%.
 */
export const PRODUCTO_MAXIMO_PCT = 60;

/**
 * Mediana de brillo del producto entre el techo del fondo. Debajo de esto la
 * pieza es oscura y mate, y sus sombras se confunden con el fondo. Medido el
 * 2026-11-03 sobre las 414 fotos candidatas: casi todas las rotas (flores y
 * mariposas de tela oscuras) quedan abajo, y por encima solo hay piezas sanas.
 */
const CONTRASTE_MINIMO = 2.7;

/** Alcance en píxeles de los dos blurs: hasta ahí se corre la frontera hacia afuera. */
const PASADAS_BORDE = 4;

/** Motas de polvo sobre la tela negra: componentes sueltos de menos de esta fracción. */
const FRACCION_MOTA = 0.00012;

export type MotivoSinMascara =
  | "fondo-no-negro"
  | "sin-producto"
  | "producto-demasiado-grande"
  | "producto-oscuro";

export type AnalisisMascara =
  | {
      aplica: true;
      /** Alfa del VELO, un byte por píxel: 255 es fondo y 0 es producto. */
      alfa: Uint8Array;
      ancho: number;
      alto: number;
      /** Brillo hasta donde llega el fondo en esta foto. */
      nivelFondo: number;
      pctFondo: number;
      /** % de la foto en transición. Alto = foto dudosa, se revisa primero. */
      pctTransicion: number;
    }
  | { aplica: false; motivo: MotivoSinMascara; nivelFondo: number; pctFondo: number };

/** Blur de caja separable con suma corrida. Repite el borde en vez de oscurecerlo. */
function cajaBorrosa(fuente: Float32Array, ancho: number, alto: number, radio: number): Float32Array {
  const ventana = 2 * radio + 1;
  const horizontal = new Float32Array(ancho * alto);
  for (let y = 0; y < alto; y++) {
    const fila = y * ancho;
    let suma = 0;
    for (let x = -radio; x <= radio; x++) suma += fuente[fila + Math.min(ancho - 1, Math.max(0, x))];
    for (let x = 0; x < ancho; x++) {
      horizontal[fila + x] = suma / ventana;
      suma += fuente[fila + Math.min(ancho - 1, x + radio + 1)] - fuente[fila + Math.max(0, x - radio)];
    }
  }
  const salida = new Float32Array(ancho * alto);
  for (let x = 0; x < ancho; x++) {
    let suma = 0;
    for (let y = -radio; y <= radio; y++) suma += horizontal[Math.min(alto - 1, Math.max(0, y)) * ancho + x];
    for (let y = 0; y < alto; y++) {
      salida[y * ancho + x] = suma / ventana;
      suma +=
        horizontal[Math.min(alto - 1, y + radio + 1) * ancho + x] -
        horizontal[Math.max(0, y - radio) * ancho + x];
    }
  }
  return salida;
}

/** Nivel de fondo: un percentil alto del anillo de orilla ya suavizado, con tope. */
function nivelDeOrilla(brillo: Float32Array, ancho: number, alto: number): number {
  const margen = Math.max(1, Math.round(Math.min(ancho, alto) * ANILLO_ORILLA));
  const anillo: number[] = [];
  for (let y = 0; y < alto; y++) {
    const borde = y < margen || y >= alto - margen;
    for (let x = 0; x < ancho; x++) {
      if (borde || x < margen || x >= ancho - margen) anillo.push(brillo[y * ancho + x]);
    }
  }
  return Math.min(percentil(anillo, PERCENTIL_ORILLA), percentil(anillo, 0.9) + HOLGURA_SOBRE_P90);
}

/** Histograma de 256 cubetas del brillo, suavizado para que un hueco suelto no parezca valle. */
function histograma(brillo: Float32Array): Float64Array {
  const crudo = new Float64Array(256);
  for (let i = 0; i < brillo.length; i++) crudo[Math.round(brillo[i])]++;
  const suave = new Float64Array(256);
  for (let v = 0; v < 256; v++) {
    suave[v] = (crudo[Math.max(0, v - 1)] + crudo[v] + crudo[Math.min(255, v + 1)]) / 3;
  }
  return suave;
}

/** Hasta qué brillo llega el fondo: de la cima del histograma, hacia arriba, hasta el valle. */
function techoDelFondo(brillo: Float32Array): number {
  const h = histograma(brillo);
  let cima = 0;
  for (let v = 1; v < NIVEL_MAXIMO_FONDO; v++) if (h[v] > h[cima]) cima = v;
  let techo = cima;
  while (techo < 255 && h[techo] >= h[cima] * FRACCION_VALLE) techo++;
  return techo;
}

/** Distancia del inicio del producto a su primer cuartil, dentro de los topes. */
function anchoDeTransicion(brillo: Float32Array, inicio: number): number {
  const h = histograma(brillo);
  let total = 0;
  for (let v = Math.ceil(inicio); v < 256; v++) total += h[v];
  let acumulado = 0;
  for (let v = Math.ceil(inicio); v < 256; v++) {
    acumulado += h[v];
    if (acumulado >= total / 4) {
      return Math.min(TRANSICION_MAXIMA, Math.max(TRANSICION_MINIMA, v - inicio));
    }
  }
  return TRANSICION_MAXIMA;
}

/**
 * Quita el contorno negro. El blur reparte el brillo del producto unos píxeles
 * hacia afuera, y ahí el velo se abre sobre fondo que sigue negro: medido a 1:1,
 * un contorno de 2 a 3 píxeles alrededor de las flores. No se puede quitar el
 * blur, porque las facetas oscuras de las piedras saldrían blancas. Una faceta y
 * el contorno se ven igual, pero solo el contorno toca el fondo: por eso se
 * crece desde el fondo, pocas pasadas y solo a través de píxeles tenues. Mide
 * sobre un brillo apenas suavizado: con el crudo, cada píxel de ruido frenaba el
 * avance y el borde salía dentado. Al final suaviza SOLO hacia el blanco, para
 * quitar la escalera sin volver a abrir el velo sobre negro.
 */
function afinarBorde(
  alfa: Uint8Array,
  crudo: Float32Array,
  limite: number,
  ancho: number,
  alto: number
): void {
  const n = ancho * alto;
  const fino = cajaBorrosa(crudo, ancho, alto, 1);
  for (let pasada = 0; pasada < PASADAS_BORDE; pasada++) {
    const frente: number[] = [];
    for (let i = 0; i < n; i++) {
      if (alfa[i] === 255 || fino[i] >= limite) continue;
      const x = i % ancho;
      const tocaFondo =
        (x > 0 && alfa[i - 1] === 255) ||
        (x < ancho - 1 && alfa[i + 1] === 255) ||
        (i >= ancho && alfa[i - ancho] === 255) ||
        (i < n - ancho && alfa[i + ancho] === 255);
      if (tocaFondo) frente.push(i);
    }
    if (frente.length === 0) break;
    for (const i of frente) alfa[i] = 255;
  }
  const suave = cajaBorrosa(Float32Array.from(alfa), ancho, alto, 1);
  for (let i = 0; i < n; i++) alfa[i] = Math.max(alfa[i], Math.round(suave[i]));
}

/**
 * Quita del velo los componentes sueltos diminutos: el polvo de la tela negra
 * sale como un punto sobre blanco. Corre antes de la envolvente, porque un
 * contenedor no debe estirarse hacia una mota. Recorre con pila propia: una pieza
 * grande reventaría la recursión.
 */
function limpiarMotas(alfa: Uint8Array, ancho: number, alto: number): void {
  const n = ancho * alto;
  const minimo = n * FRACCION_MOTA;
  const visto = new Uint8Array(n);
  const pila: number[] = [];
  for (let origen = 0; origen < n; origen++) {
    if (visto[origen] || alfa[origen] === 255) continue;
    const componente: number[] = [];
    visto[origen] = 1;
    pila.push(origen);
    while (pila.length) {
      const i = pila.pop()!;
      componente.push(i);
      const x = i % ancho;
      const vecinos = [x > 0 ? i - 1 : -1, x < ancho - 1 ? i + 1 : -1, i - ancho, i + ancho];
      for (const v of vecinos) {
        if (v >= 0 && v < n && !visto[v] && alfa[v] !== 255) {
          visto[v] = 1;
          pila.push(v);
        }
      }
    }
    if (componente.length < minimo) for (const i of componente) alfa[i] = 255;
  }
}

/** Envolvente convexa por cadena monótona. */
function envolvente(puntos: [number, number][]): [number, number][] {
  const orden = [...puntos].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const giro = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
  const media = (lista: [number, number][]) => {
    const h: [number, number][] = [];
    for (const p of lista) {
      while (h.length >= 2 && giro(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return [...media(orden), ...media([...orden].reverse())];
}

/**
 * Conserva todo lo que queda dentro de la envolvente convexa del producto: en un
 * cuenco o una bolsita, lo negro de adentro es lo que se ve a través y no fondo.
 * Un cierre morfológico con radio fijo dejaba bloques cuadrados; estas piezas son
 * convexas, así que la envolvente es casi su contorno real.
 */
function conservarEnvolvente(alfa: Uint8Array, ancho: number, alto: number): void {
  const puntos: [number, number][] = [];
  for (let y = 0; y < alto; y++) {
    let izquierda = -1;
    let derecha = -1;
    for (let x = 0; x < ancho; x++) {
      if (alfa[y * ancho + x] < 128) {
        if (izquierda < 0) izquierda = x;
        derecha = x;
      }
    }
    if (izquierda >= 0) puntos.push([izquierda, y], [derecha, y]);
  }
  if (puntos.length < 6) return;
  const poligono = envolvente(puntos);

  const dentro = new Float32Array(ancho * alto);
  for (let y = 0; y < alto; y++) {
    const cortes: number[] = [];
    for (let i = 0; i < poligono.length; i++) {
      const [x0, y0] = poligono[i];
      const [x1, y1] = poligono[(i + 1) % poligono.length];
      if ((y0 <= y && y < y1) || (y1 <= y && y < y0)) {
        cortes.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    if (cortes.length < 2) continue;
    const desde = Math.max(0, Math.ceil(Math.min(...cortes)));
    const hasta = Math.min(ancho - 1, Math.floor(Math.max(...cortes)));
    for (let x = desde; x <= hasta; x++) dentro[y * ancho + x] = 1;
  }
  // Suaviza el borde del polígono: sin esto sería una línea dentada sobre blanco.
  const suave = cajaBorrosa(dentro, ancho, alto, 1);
  for (let i = 0; i < alfa.length; i++) {
    alfa[i] = Math.min(alfa[i], Math.round((1 - suave[i]) * 255));
  }
}

/** Mediana del brillo original dentro del producto. */
function medianaDelProducto(px: Uint8Array, alfa: Uint8Array, canales: number): number {
  const cubetas = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < alfa.length; i++) {
    if (alfa[i] >= 128) continue;
    const k = i * canales;
    cubetas[Math.max(px[k], px[k + 1], px[k + 2])]++;
    total++;
  }
  let acumulado = 0;
  for (let v = 0; v < 256; v++) {
    acumulado += cubetas[v];
    if (acumulado * 2 >= total) return v;
  }
  return 0;
}

/**
 * Decide, sobre píxeles crudos, si la foto admite máscara y calcula el alfa del
 * velo. Función pura: mismos píxeles, misma máscara.
 *
 * El brillo es `max(r,g,b)` y no la luminancia porque un azul rey o un rojo
 * oscuro tienen luminancia casi de fondo: con luminancia desaparecerían.
 */
export function analizarPixeles(
  px: Uint8Array,
  ancho: number,
  alto: number,
  canales: number,
  { contenedor = false }: { contenedor?: boolean } = {}
): AnalisisMascara {
  const n = ancho * alto;
  let brillo: Float32Array = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = i * canales;
    brillo[i] = Math.max(px[k], px[k + 1], px[k + 2]);
  }
  const crudo = brillo;
  for (const radio of RADIOS_SUAVIZADO) brillo = cajaBorrosa(brillo, ancho, alto, radio);

  const nivelFondo = nivelDeOrilla(brillo, ancho, alto);
  if (nivelFondo >= NIVEL_MAXIMO_FONDO) {
    return { aplica: false, motivo: "fondo-no-negro", nivelFondo, pctFondo: 0 };
  }

  const techo = Math.max(nivelFondo, techoDelFondo(brillo));
  const inicio = techo + MARGEN_SOBRE_FONDO;
  const transicion = anchoDeTransicion(brillo, inicio);
  const alfa = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, Math.max(0, (brillo[i] - inicio) / transicion));
    const producto = t * t * (3 - 2 * t); // smoothstep: sin escalón visible en el borde
    alfa[i] = Math.round((1 - producto) * 255);
  }
  afinarBorde(alfa, crudo, inicio + transicion, ancho, alto);
  limpiarMotas(alfa, ancho, alto);
  if (contenedor) conservarEnvolvente(alfa, ancho, alto);

  let fondo = 0;
  let parcial = 0;
  for (let i = 0; i < n; i++) {
    if (alfa[i] >= 128) fondo++;
    if (alfa[i] > 0 && alfa[i] < 255) parcial++;
  }
  const pctTransicion = (parcial / n) * 100;
  const pctFondo = (fondo / n) * 100;
  const pctProducto = 100 - pctFondo;

  if (pctProducto < PRODUCTO_MINIMO_PCT) {
    return { aplica: false, motivo: "sin-producto", nivelFondo: techo, pctFondo };
  }
  if (pctProducto > PRODUCTO_MAXIMO_PCT) {
    return { aplica: false, motivo: "producto-demasiado-grande", nivelFondo: techo, pctFondo };
  }
  if (!contenedor && medianaDelProducto(px, alfa, canales) / Math.max(techo, 1) < CONTRASTE_MINIMO) {
    return { aplica: false, motivo: "producto-oscuro", nivelFondo: techo, pctFondo };
  }
  return { aplica: true, alfa, ancho, alto, nivelFondo: techo, pctFondo, pctTransicion };
}

/** Analiza los bytes de una imagen (normalmente el derivado `sm`). */
export async function analizarImagen(
  bytes: Buffer | Uint8Array,
  opciones: { contenedor?: boolean } = {}
): Promise<AnalisisMascara> {
  const { data, info } = await sharp(bytes, { failOn: "error" })
    .removeAlpha()
    .resize(LADO_ANALISIS, LADO_ANALISIS, { fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return analizarPixeles(data, info.width, info.height, info.channels, opciones);
}

/** El alfa del velo como RGBA blanco: el color es constante, solo manda el alfa. */
export function veloRgba(alfa: Uint8Array): Buffer {
  const rgba = Buffer.alloc(alfa.length * 4, 255);
  for (let i = 0; i < alfa.length; i++) rgba[i * 4 + 3] = alfa[i];
  return rgba;
}

/**
 * Codificación de la máscara guardada, medida con `pnpm medir:mascaras` el
 * 2026-11-03 sobre 30 fotos. Va al mismo tamaño que el análisis (800) y sin
 * pérdida, con error 0. Cualquier tamaño menor da un error mayor a 100/255, porque
 * las piedras son más finas que los píxeles de la máscara, y la versión con
 * pérdida ahorraba menos de 1 KB tardando cuatro veces más, tiempo que `after()`
 * necesita. Sobre las 398 fotos que aplican: p50 2.9 KB, p95 15.7 KB, 2 MB en
 * total y 0.14 MB por cada 48 tarjetas, contra 1.16 MB de sus fotos.
 */
const OPCIONES_WEBP: WebpOptions = { lossless: true, effort: 6 };

/**
 * Codifica el velo para guardarlo. Rechaza una máscara totalmente opaca: en el
 * catálogo sería un cuadro blanco encima del producto, el único fallo de esta
 * función que el cliente no podría disimular.
 */
export async function codificarMascara(
  alfa: Uint8Array,
  ancho: number,
  alto: number
): Promise<{ buffer: Buffer; ancho: number; alto: number }> {
  const { data, info } = await sharp(veloRgba(alfa), { raw: { width: ancho, height: alto, channels: 4 } })
    .webp(OPCIONES_WEBP)
    .toBuffer({ resolveWithObject: true });
  const { isOpaque } = await sharp(data).stats();
  if (isOpaque) throw new Error("La máscara salió opaca: taparía el producto");
  return { buffer: data, ancho: info.width, alto: info.height };
}

export type ResultadoMascara =
  | { estado: "guardada"; nivelFondo: number; pctFondo: number; pctTransicion: number }
  | { estado: "no-aplica"; motivo: MotivoSinMascara }
  | { estado: "sin-derivados" };

/**
 * Genera la máscara de una foto y la guarda. Sale del derivado `sm`, nunca del
 * original, y solo escribe en `foto_mascara` y bajo `mascaras/`. Lanza en
 * cualquier fallo; el caller decide si es fatal (backfill) o solo se loguea
 * (`after()` en la subida), y en ese caso el catálogo sigue con la foto original.
 *
 * `reemplazar` es para `--regenerar-vencidas`: no manda `activa`, así que
 * conserva lo que la tienda decidió. Sin él, una fila que ya exista se queda
 * como está aunque otra corrida haya llegado primero.
 */
export async function generarYGuardarMascara(
  supabase: SupabaseClient,
  {
    fotoId,
    derivados,
    activa,
    contenedor = false,
    reemplazar = false,
  }: {
    fotoId: string;
    derivados: DerivadosFoto | null;
    activa: boolean;
    contenedor?: boolean;
    reemplazar?: boolean;
  }
): Promise<ResultadoMascara> {
  const fuente = derivados?.generado_en;
  if (!derivados?.sm || !fuente) return { estado: "sin-derivados" };

  const { data: blob, error: errorBajada } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(derivados.sm.ruta);
  if (errorBajada || !blob) {
    throw new Error(`No se pudo descargar "${derivados.sm.ruta}": ${errorBajada?.message ?? "sin datos"}`);
  }

  const analisis = await analizarImagen(new Uint8Array(await blob.arrayBuffer()), { contenedor });
  if (!analisis.aplica) return { estado: "no-aplica", motivo: analisis.motivo };

  const mascara = await codificarMascara(analisis.alfa, analisis.ancho, analisis.alto);
  const ruta = rutaMascara(fotoId, "sm");
  // Caché larga: la URL lleva `?v=` con `generado_en`, así que al regenerar cambia.
  const { error: errorSubida } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(ruta, mascara.buffer, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
  if (errorSubida) throw new Error(`No se pudo subir "${ruta}": ${errorSubida.message}`);

  const datos = {
    ruta_sm: ruta,
    ruta_md: null,
    ancho: mascara.ancho,
    alto: mascara.alto,
    nivel_fondo: analisis.nivelFondo,
    pct_fondo: analisis.pctFondo,
    pct_transicion: analisis.pctTransicion,
    fuente_generado_en: fuente,
    generado_en: new Date().toISOString(),
  };
  const { error } = reemplazar
    ? await supabase.from("foto_mascara").update(datos).eq("foto_id", fotoId)
    : await supabase
        .from("foto_mascara")
        .upsert({ foto_id: fotoId, activa, ...datos }, { onConflict: "foto_id", ignoreDuplicates: true });
  if (error) throw new Error(`Máscara subida pero no registrada: ${error.message}`);

  return {
    estado: "guardada",
    nivelFondo: analisis.nivelFondo,
    pctFondo: analisis.pctFondo,
    pctTransicion: analisis.pctTransicion,
  };
}
