#!/usr/bin/env tsx
/**
 * Backfill de máscaras de fondo blanco — Telas La Jalisciense
 * ===========================================================================
 * Genera la máscara de las fotos que aún no la tienen. SOLO escribe en
 * `foto_mascara` y bajo `mascaras/` en el bucket: nunca en `foto`, `variante` ni
 * `tela`, y nunca toca una foto ni un derivado.
 *
 *   pnpm backfill:mascaras                → SIMULACRO: dice qué haría, sin escribir
 *   pnpm backfill:mascaras --limit=20     → simulacro de las primeras N
 *   pnpm backfill:mascaras --aplicar --activar-hasta=2026-11-03T00:00:00Z
 *   pnpm backfill:mascaras --aplicar --activar-hasta=… --regenerar-vencidas
 *
 * --activar-hasta es obligatoria al aplicar: lo subido hasta esa fecha entra
 * encendido y lo posterior apagado. "No tiene fila" no distingue una foto vieja
 * de una recién subida por `pnpm ingest`, y una foto nueva nunca debe encenderse
 * sola. Las fotos que ya tienen fila se saltan ANTES de subir nada: re-correrlo
 * no pisa lo que la tienda decidió en /admin/fondos.
 *
 * --regenerar-vencidas rehace las máscaras de fotos reprocesadas después de
 * generarlas, conservando si estaban encendidas o apagadas.
 *
 * Antes del primer --aplicar: `pnpm respaldo:completo --destino=<carpeta>`.
 * Requiere la migración sql/2026-11-03-fondo-blanco.sql.
 * ===========================================================================
 */
import { config as loadEnv } from "dotenv";
import { writeFile } from "node:fs/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DerivadosFoto } from "../lib/types";
import { activaSegunFecha, esContenedor, mascaraVigente } from "../lib/fondo-blanco";
import { analizarImagen, generarYGuardarMascara } from "../lib/images/mascara";
import { STORAGE_BUCKET } from "../lib/supabase/storage";
import { esTablaFaltante } from "../lib/categorias-extra";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const bandera = (n: string) =>
  process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);

const APLICAR = process.argv.includes("--aplicar");
const REGENERAR = process.argv.includes("--regenerar-vencidas");
const LIMITE = bandera("limit") ? parseInt(bandera("limit")!, 10) : Infinity;
const REPORTE = bandera("reporte");
const ACTIVAR_HASTA_TXT = bandera("activar-hasta");
const CONCURRENCIA = 4;
const TAM_PAGINA = 1000;

type FilaFoto = {
  id: string;
  ruta: string;
  created_at: string;
  derivados: DerivadosFoto | null;
  variante: {
    color: { nombre: string; slug: string } | null;
    tela: { nombre: string; categoria: { slug: string } | null } | null;
  } | null;
};

type Existente = { foto_id: string; fuente_generado_en: string; activa: boolean };

/** Corre `tarea` sobre `items` con como mucho `limite` en vuelo a la vez. */
async function enParalelo<T>(items: T[], limite: number, tarea: (item: T, i: number) => Promise<void>) {
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(limite, items.length) }, async () => {
      for (;;) {
        const i = siguiente++;
        if (i >= items.length) return;
        await tarea(items[i], i);
      }
    })
  );
}

/** Paginado con `order` por el tope de filas de PostgREST: sin esto, se trunca sin avisar. */
async function leerFotos(supabase: SupabaseClient): Promise<FilaFoto[]> {
  const fotos: FilaFoto[] = [];
  for (let desde = 0; ; desde += TAM_PAGINA) {
    const { data, error } = await supabase
      .from("foto")
      .select(
        "id, ruta, created_at, derivados, " +
          "variante:variante_id(color:color_id(nombre,slug), tela:tela_id(nombre, categoria:categoria_id(slug)))"
      )
      .order("id")
      .range(desde, desde + TAM_PAGINA - 1);
    if (error) throw new Error(`No pude leer las fotos: ${error.message}`);
    fotos.push(...((data ?? []) as unknown as FilaFoto[]));
    if ((data ?? []).length < TAM_PAGINA) return fotos;
  }
}

/** Devuelve null si la tabla no existe todavía: la migración no se ha corrido. */
async function leerExistentes(supabase: SupabaseClient): Promise<Map<string, Existente> | null> {
  const filas = new Map<string, Existente>();
  for (let desde = 0; ; desde += TAM_PAGINA) {
    const { data, error } = await supabase
      .from("foto_mascara")
      .select("foto_id, fuente_generado_en, activa")
      .order("foto_id")
      .range(desde, desde + TAM_PAGINA - 1);
    if (error) {
      if (esTablaFaltante(error.code)) return null;
      throw new Error(`No pude leer foto_mascara: ${error.message}`);
    }
    for (const fila of (data ?? []) as Existente[]) filas.set(fila.foto_id, fila);
    if ((data ?? []).length < TAM_PAGINA) return filas;
  }
}

const nombreDe = (f: FilaFoto) =>
  [f.variante?.tela?.nombre ?? f.ruta, f.variante?.color?.nombre].filter(Boolean).join(" · ");

const esNegro = (f: FilaFoto) =>
  /negr/i.test(`${f.variante?.color?.slug ?? ""} ${f.variante?.color?.nombre ?? ""}`);

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (APLICAR && !ACTIVAR_HASTA_TXT) {
    console.error("✖ --aplicar exige --activar-hasta=<fecha>: lo subido hasta ahí entra encendido.");
    process.exit(1);
  }
  const activarHasta = ACTIVAR_HASTA_TXT ? new Date(ACTIVAR_HASTA_TXT) : null;
  if (activarHasta && Number.isNaN(activarHasta.getTime())) {
    console.error(`✖ --activar-hasta ilegible: "${ACTIVAR_HASTA_TXT}"`);
    process.exit(1);
  }
  if (!url || !(servicio ?? anonima)) {
    console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL y una clave de Supabase en .env.local");
    process.exit(1);
  }
  if (APLICAR && !servicio) {
    console.error("✖ --aplicar requiere SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }
  const supabase = createClient(url, (servicio ?? anonima)!, { auth: { persistSession: false } });

  const fotos = await leerFotos(supabase);
  const existentes = await leerExistentes(supabase);
  if (!existentes && APLICAR) {
    console.error("✖ foto_mascara no existe. Corre sql/2026-11-03-fondo-blanco.sql en Studio.");
    process.exit(1);
  }
  const filas = existentes ?? new Map<string, Existente>();

  const sinDerivados = fotos.filter((f) => !f.derivados?.sm || !f.derivados.generado_en);
  const procesables = fotos.filter((f) => f.derivados?.sm && f.derivados.generado_en);
  const nuevas = procesables.filter((f) => !filas.has(f.id));
  const vencidas = procesables.filter((f) => {
    const fila = filas.get(f.id);
    return fila && !mascaraVigente(fila.fuente_generado_en, f.derivados?.generado_en);
  });
  const lote = [...nuevas, ...(REGENERAR ? vencidas : [])].slice(0, LIMITE);

  console.log(`\n${APLICAR ? "⚠ APLICANDO" : "SIMULACRO: no se escribe nada."}`);
  console.log(`Fotos: ${fotos.length}. Sin derivados (se saltan): ${sinDerivados.length}.`);
  console.log(`Con máscara: ${filas.size}. Vencidas: ${vencidas.length}. Por procesar: ${lote.length}.`);
  if (!existentes) console.log("foto_mascara aún no existe: falta correr la migración.");
  if (!activarHasta) console.log("Sin --activar-hasta: todas se cuentan como nuevas (apagadas).");
  console.log("");

  const motivos: Record<string, FilaFoto[]> = {};
  const generables: {
    foto: FilaFoto; pctProducto: number; nivelFondo: number; pctTransicion: number; activa: boolean;
  }[] = [];
  const fallas: string[] = [];
  let guardadas = 0;

  await enParalelo(lote, CONCURRENCIA, async (foto, i) => {
    const derivados = foto.derivados!;
    const activa = activarHasta ? activaSegunFecha(foto.created_at, activarHasta) : false;
    const reemplazar = filas.has(foto.id);
    const contenedor = esContenedor(foto.variante?.tela?.categoria?.slug);
    try {
      if (APLICAR) {
        const r = await generarYGuardarMascara(supabase, {
          fotoId: foto.id, derivados, activa, contenedor, reemplazar,
        });
        if (r.estado === "no-aplica") (motivos[r.motivo] ??= []).push(foto);
        if (r.estado === "guardada") {
          guardadas++;
          generables.push({
            foto, activa,
            pctProducto: 100 - r.pctFondo, nivelFondo: r.nivelFondo, pctTransicion: r.pctTransicion,
          });
        }
      } else {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(derivados.sm!.ruta);
        if (error || !data) throw new Error(error?.message ?? "sin datos");
        const analisis = await analizarImagen(new Uint8Array(await data.arrayBuffer()), { contenedor });
        if (analisis.aplica) {
          generables.push({
            foto, activa,
            pctProducto: 100 - analisis.pctFondo, nivelFondo: analisis.nivelFondo,
            pctTransicion: analisis.pctTransicion,
          });
        } else {
          (motivos[analisis.motivo] ??= []).push(foto);
        }
      }
    } catch (e) {
      fallas.push(`${foto.ruta}: ${(e as Error).message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`   … ${i + 1}/${lote.length}`);
  });

  const porProducto = [...generables].sort((a, b) => a.pctProducto - b.pctProducto);
  const encendidas = generables.filter((g) => g.activa).length;
  const negras = generables.filter((g) => esNegro(g.foto) && g.activa);

  console.log(`\nAplica: ${generables.length} (${encendidas} encendidas, ${generables.length - encendidas} apagadas).`);
  if (APLICAR) console.log(`Guardadas: ${guardadas}.`);
  for (const [motivo, lista] of Object.entries(motivos)) {
    console.log(`No aplica, ${motivo}: ${lista.length}`);
    lista.slice(0, 12).forEach((f) => console.log(`   · ${nombreDe(f)}`));
    if (lista.length > 12) console.log(`   · … y ${lista.length - 12} más (ver --reporte)`);
  }
  if (porProducto.length) {
    const p = (q: number) => porProducto[Math.floor((porProducto.length - 1) * q)];
    console.log(
      `\nProducto como % de la foto: mín ${p(0).pctProducto.toFixed(1)}, ` +
        `p50 ${p(0.5).pctProducto.toFixed(1)}, máx ${p(1).pctProducto.toFixed(1)}`
    );
    console.log("Las 5 con menos producto (revísalas, podrían ser un cuadro blanco):");
    porProducto.slice(0, 5).forEach((g) => console.log(`   · ${nombreDe(g.foto)}: ${g.pctProducto.toFixed(2)}%`));
    console.log("Las 5 con más producto:");
    porProducto.slice(-5).forEach((g) => console.log(`   · ${nombreDe(g.foto)}: ${g.pctProducto.toFixed(2)}%`));
  }
  const dudosas = [...generables].sort((a, b) => b.pctTransicion - a.pctTransicion).slice(0, 15);
  if (dudosas.length) {
    console.log("\nLas 15 con más transición (se revisan primero en /admin/fondos):");
    dudosas.forEach((g) => console.log(`   · ${nombreDe(g.foto)}: ${g.pctTransicion.toFixed(1)}%`));
  }
  if (negras.length) {
    console.log(`\nColor negro y encendidas: ${negras.length}. Revísalas en /admin/fondos, no se apagan solas:`);
    negras.forEach((g) => console.log(`   · ${nombreDe(g.foto)}`));
  }
  if (vencidas.length && !REGENERAR) {
    console.log(`\n${vencidas.length} máscaras vencidas sin regenerar: el catálogo muestra la foto original. Usa --regenerar-vencidas.`);
  }
  if (fallas.length) {
    console.log(`\n✖ ${fallas.length} fallas:`);
    fallas.forEach((f) => console.log(`   · ${f}`));
    process.exitCode = 1;
  }
  if (REPORTE) {
    await writeFile(
      REPORTE,
      JSON.stringify(
        {
          aplica: porProducto.map((g) => ({
            id: g.foto.id, nombre: nombreDe(g.foto), activa: g.activa,
            pctProducto: g.pctProducto, nivelFondo: g.nivelFondo, pctTransicion: g.pctTransicion,
            contenedor: esContenedor(g.foto.variante?.tela?.categoria?.slug),
            sm: g.foto.derivados?.sm?.ruta,
          })),
          noAplica: Object.fromEntries(
            Object.entries(motivos).map(([m, lista]) => [
              m, lista.map((f) => ({ id: f.id, nombre: nombreDe(f), sm: f.derivados?.sm?.ruta })),
            ])
          ),
        },
        null,
        2
      )
    );
    console.log(`\nReporte: ${REPORTE}`);
  }
  if (!APLICAR) console.log("\nSimulacro terminado. No se escribió nada.");
}

main().catch((e) => {
  console.error("✖", e.message);
  process.exit(1);
});
