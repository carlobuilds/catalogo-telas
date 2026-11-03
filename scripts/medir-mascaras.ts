#!/usr/bin/env tsx
/**
 * Medición de la máscara de fondo blanco — SOLO LECTURA
 * ===========================================================================
 * Decide con datos a qué tamaño y con qué codificación se guarda la máscara. No
 * escribe en la base ni en el bucket: baja derivados `sm` públicos y mide en
 * memoria. Usa la clave anónima a propósito.
 *
 *   pnpm medir:mascaras                 → 30 fotos, tabla de combinaciones
 *   pnpm medir:mascaras --muestra=9     → otra cantidad de fotos
 *   pnpm medir:mascaras --hoja=640,16,webp-alfa-80 --salida=<carpeta>
 *                                       → PNG con la foto, la referencia y esa
 *                                         combinación, para buscar halos a ojo
 *
 * Error: se compone igual que el catálogo, `min(255, foto + velo)`, con la
 * máscara exacta y con la codificada, y se toma el percentil 99 de la diferencia
 * dentro de la zona de producto. Afuera todo es blanco y no aporta información.
 * ===========================================================================
 */
import { config as loadEnv } from "dotenv";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp, { type OverlayOptions, type Sharp } from "sharp";
import type { DerivadosFoto } from "../lib/types";
import { SECCIONES_MERCERIA } from "../lib/catalogos";
import { esContenedor } from "../lib/fondo-blanco";
import { analizarImagen, LADO_ANALISIS, veloRgba } from "../lib/images/mascara";
import { percentil } from "../lib/images/recorte";
import { publicImageUrl } from "../lib/supabase/storage";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const bandera = (n: string) =>
  process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);

const MUESTRA = Number(bandera("muestra") ?? 30);
const HOJA = bandera("hoja");
const SALIDA = bandera("salida");

const TAMANOS = [400, 512, 640, 800];
const NIVELES: (number | null)[] = [null, 32, 16, 8];

type Codificador = { id: string; aplicar: (s: Sharp) => Sharp; soloSinNiveles?: boolean };

const CODIFICADORES: Codificador[] = [
  { id: "webp-sin-perdida", aplicar: (s) => s.webp({ lossless: true, effort: 6 }) },
  { id: "webp-alfa-100", aplicar: (s) => s.webp({ quality: 1, alphaQuality: 100, effort: 6 }) },
  { id: "webp-alfa-80", aplicar: (s) => s.webp({ quality: 1, alphaQuality: 80, effort: 6 }) },
  { id: "webp-alfa-50", aplicar: (s) => s.webp({ quality: 1, alphaQuality: 50, effort: 6 }) },
  { id: "webp-casi-sin-perdida", aplicar: (s) => s.webp({ nearLossless: true, quality: 60, effort: 6 }) },
  {
    id: "png-paleta-32",
    aplicar: (s) => s.png({ palette: true, colours: 32, dither: 0, compressionLevel: 9, effort: 10 }),
    soloSinNiveles: true,
  },
];

type Foto = { nombre: string; estrato: string; url: string; contenedor: boolean };
type Referencia = {
  foto: Foto;
  ancho: number;
  alto: number;
  alfa: Uint8Array;
  px: Buffer;
  pesoSm: number;
};

function estratoDe(categoria: string | null): string {
  const seccion = SECCIONES_MERCERIA.find((s) => categoria && s.categorias.includes(categoria));
  if (!seccion) return "otros";
  if (seccion.slug === "pedreria" || seccion.slug === "cristaleria") return "pedreria";
  if (seccion.slug === "encajes-y-tiras") return "encajes";
  return "simples";
}

/** Lee las fotos principales de la vista, paginando como `getIndiceCatalogo`. */
async function leerFotos(): Promise<Foto[]> {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const fotos: Foto[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("catalogo_telas")
      .select("variante_id,tela_nombre,color_nombre,categoria_slug,foto_principal_derivados")
      .order("variante_id")
      .range(desde, desde + 999);
    if (error) throw new Error(`No pude leer la vista: ${error.message}`);
    for (const fila of data ?? []) {
      const derivados = fila.foto_principal_derivados as DerivadosFoto | null;
      const sm = publicImageUrl(derivados?.sm?.ruta);
      if (sm) {
        fotos.push({
          nombre: [fila.tela_nombre, fila.color_nombre].filter(Boolean).join(" "),
          estrato: estratoDe(fila.categoria_slug),
          contenedor: esContenedor(fila.categoria_slug),
          url: sm,
        });
      }
    }
    if ((data ?? []).length < 1000) return fotos;
  }
}

/** Reparte la muestra entre estratos, tomando fotos separadas entre sí. */
async function elegirMuestra(fotos: Foto[]): Promise<Referencia[]> {
  const estratos = ["pedreria", "encajes", "simples"];
  const porEstrato = Math.ceil(MUESTRA / estratos.length);
  const salida: Referencia[] = [];
  for (const estrato of estratos) {
    const lista = fotos.filter((f) => f.estrato === estrato);
    const paso = Math.max(1, Math.floor(lista.length / (porEstrato * 2)));
    let tomadas = 0;
    for (let i = 0; i < lista.length && tomadas < porEstrato; i += paso) {
      const respuesta = await fetch(lista[i].url);
      if (!respuesta.ok) continue;
      const bytes = Buffer.from(await respuesta.arrayBuffer());
      const analisis = await analizarImagen(bytes, { contenedor: lista[i].contenedor });
      if (!analisis.aplica) continue;
      const { data } = await sharp(bytes)
        .removeAlpha()
        .resize(LADO_ANALISIS, LADO_ANALISIS, { fit: "inside", withoutEnlargement: true })
        .raw()
        .toBuffer({ resolveWithObject: true });
      salida.push({
        foto: lista[i],
        ancho: analisis.ancho,
        alto: analisis.alto,
        alfa: analisis.alfa,
        px: data,
        pesoSm: bytes.length,
      });
      tomadas++;
    }
  }
  return salida;
}

/** Reduce el alfa a N niveles, llevando los extremos a 0 y 255 exactos. */
function cuantizar(rgba: Buffer, niveles: number): void {
  for (let i = 3; i < rgba.length; i += 4) {
    const n = Math.round((rgba[i] / 255) * (niveles - 1));
    rgba[i] = Math.round((n / (niveles - 1)) * 255);
  }
}

async function codificar(ref: Referencia, lado: number, niveles: number | null, c: Codificador) {
  const { data, info } = await sharp(veloRgba(ref.alfa), {
    raw: { width: ref.ancho, height: ref.alto, channels: 4 },
  })
    .resize(lado, lado, { fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (niveles) cuantizar(data, niveles);
  const inicio = performance.now();
  const buffer = await c
    .aplicar(sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }))
    .toBuffer();
  return { buffer, ms: performance.now() - inicio };
}

/** Alfa de la máscara codificada, llevado al tamaño de la foto como lo haría el navegador. */
async function alfaDecodificado(ref: Referencia, buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .ensureAlpha()
    .extractChannel(3)
    .resize(ref.ancho, ref.alto, { fit: "fill", kernel: "linear" })
    .raw()
    .toBuffer();
}

/** Percentil 99 de la diferencia al componer, solo donde hay producto o transición. */
function errorP99(ref: Referencia, decodificado: Buffer): number {
  const diferencias: number[] = [];
  for (let i = 0; i < ref.alfa.length; i++) {
    const exacto = ref.alfa[i];
    const nuevo = decodificado[i];
    if (exacto === 255 && nuevo === 255) continue;
    let peor = 0;
    for (let canal = 0; canal < 3; canal++) {
      const p = ref.px[i * 3 + canal];
      peor = Math.max(peor, Math.abs(Math.min(255, p + exacto) - Math.min(255, p + nuevo)));
    }
    diferencias.push(peor);
  }
  return diferencias.length ? percentil(diferencias, 0.99) : 0;
}

async function medirTabla(muestra: Referencia[]) {
  const filas: {
    combinacion: string; kbP50: number; kbP95: number; ms: number; errP50: number; errPeor: number;
  }[] = [];
  for (const lado of TAMANOS) {
    for (const niveles of NIVELES) {
      for (const c of CODIFICADORES) {
        if (c.soloSinNiveles && niveles) continue;
        const pesos: number[] = [], tiempos: number[] = [], errores: number[] = [];
        for (const ref of muestra) {
          const { buffer, ms } = await codificar(ref, lado, niveles, c);
          pesos.push(buffer.length / 1024);
          tiempos.push(ms);
          errores.push(errorP99(ref, await alfaDecodificado(ref, buffer)));
        }
        filas.push({
          combinacion: `${lado},${niveles ?? "todos"},${c.id}`,
          kbP50: percentil(pesos, 0.5),
          kbP95: percentil(pesos, 0.95),
          ms: percentil(tiempos, 0.5),
          errP50: percentil(errores, 0.5),
          errPeor: Math.max(...errores),
        });
      }
      console.log(`   … ${lado}px, ${niveles ?? "todos"} niveles`);
    }
  }
  return filas.sort((a, b) => a.kbP50 - b.kbP50);
}

async function hoja(muestra: Referencia[], especificacion: string, salida: string) {
  const [lado, nivelesTxt, id] = especificacion.split(",");
  const c = CODIFICADORES.find((x) => x.id === id);
  if (!c) throw new Error(`Codificador desconocido: ${id}`);
  const niveles = nivelesTxt === "todos" ? null : Number(nivelesTxt);
  const CELDA = 420;
  const capas: OverlayOptions[] = [];
  const elegidas = muestra.filter((_, i) => i % Math.max(1, Math.floor(muestra.length / 6)) === 0).slice(0, 6);

  for (const [fila, ref] of elegidas.entries()) {
    const { buffer } = await codificar(ref, Number(lado), niveles, c);
    const decodificado = await alfaDecodificado(ref, buffer);
    const componer = (alfa: ArrayLike<number> | null) => {
      const out = Buffer.alloc(ref.ancho * ref.alto * 3);
      for (let i = 0; i < ref.ancho * ref.alto; i++) {
        for (let canal = 0; canal < 3; canal++) {
          out[i * 3 + canal] = Math.min(255, ref.px[i * 3 + canal] + (alfa ? alfa[i] : 0));
        }
      }
      return out;
    };
    const columnas = [componer(null), componer(ref.alfa), componer(decodificado)];
    for (const [col, raw] of columnas.entries()) {
      // Recorte central a 1:1 de píxeles: ahí se ven los halos, no en la miniatura.
      const izquierda = Math.max(0, Math.floor((ref.ancho - CELDA) / 2));
      const arriba = Math.max(0, Math.floor((ref.alto - CELDA) / 2));
      const input = await sharp(raw, { raw: { width: ref.ancho, height: ref.alto, channels: 3 } })
        .extract({
          left: izquierda, top: arriba,
          width: Math.min(CELDA, ref.ancho), height: Math.min(CELDA, ref.alto),
        })
        .png()
        .toBuffer();
      capas.push({ input, left: col * (CELDA + 6), top: fila * (CELDA + 6) });
    }
  }
  await mkdir(salida, { recursive: true });
  const destino = join(salida, `hoja-${especificacion.replaceAll(",", "_")}.png`);
  await sharp({
    create: {
      width: 3 * CELDA + 12, height: elegidas.length * (CELDA + 6),
      channels: 3, background: { r: 120, g: 120, b: 120 },
    },
  })
    .composite(capas)
    .png()
    .toFile(destino);
  console.log(`   ${destino}\n   Columnas: foto · máscara exacta · ${especificacion}`);
}

async function main() {
  const fotos = await leerFotos();
  console.log(`\n${fotos.length} fotos principales en la vista. Eligiendo ${MUESTRA}…`);
  const muestra = await elegirMuestra(fotos);
  const conteo = muestra.reduce<Record<string, number>>((m, r) => {
    m[r.foto.estrato] = (m[r.foto.estrato] ?? 0) + 1;
    return m;
  }, {});
  console.log(`Muestra: ${muestra.length} fotos`, conteo);
  const pesos = muestra.map((r) => r.pesoSm / 1024);
  console.log(`Peso del derivado sm: p50 ${percentil(pesos, 0.5).toFixed(0)} KB, p95 ${percentil(pesos, 0.95).toFixed(0)} KB\n`);

  if (HOJA) {
    if (!SALIDA) throw new Error("--hoja requiere --salida=<carpeta>");
    await hoja(muestra, HOJA, resolve(SALIDA));
    return;
  }

  const filas = await medirTabla(muestra);
  console.log("\ncombinación (lado,niveles,codificador)      KB p50  KB p95   ms   err p50  err peor  48 tarjetas");
  for (const f of filas) {
    console.log(
      `${f.combinacion.padEnd(42)} ${f.kbP50.toFixed(1).padStart(6)}  ${f.kbP95.toFixed(1).padStart(6)} ` +
        `${f.ms.toFixed(0).padStart(4)}  ${String(f.errP50).padStart(7)}  ${String(f.errPeor).padStart(8)}  ` +
        `${((f.kbP50 * 48) / 1024).toFixed(2).padStart(8)} MB`
    );
  }
}

main().catch((e) => {
  console.error("✖", e.message);
  process.exit(1);
});
