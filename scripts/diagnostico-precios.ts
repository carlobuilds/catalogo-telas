#!/usr/bin/env tsx
/**
 * Diagnóstico de precios borrados — SOLO LECTURA
 * ===========================================================================
 * El editor `/admin/tela/[id]` borraba el precio de una variante al guardarla
 * (el input se llamaba `precio_metro`, cargaba vacío y la acción escribía
 * `precio: null` en todas las columnas). Este script dice a quién le pasó:
 *
 *   pnpm diagnostico:precios [--respaldo=<carpeta>]
 *
 * 1. Compara la tabla `variante` de hoy contra `datos/variante.json` del
 *    respaldo y lista las variantes cuyo PRECIO o SKU tenían valor y hoy están
 *    vacíos (con el valor del respaldo, para poder reponerlo a mano).
 * 2. Lista las variantes con `revisado_en` y sin precio: alguien las revisó,
 *    así que el hueco pudo ser una víctima del bug ANTERIOR al respaldo.
 *
 * No escribe nada: ni BD ni bucket. Reponer un precio es decisión de la
 * tienda, desde /admin o /revision, con este reporte en la mano.
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 * (o la llave anon: `variante` y `tela` tienen lectura pública).
 * ===========================================================================
 */
import { config as loadEnv } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const RESPALDO_POR_DEFECTO =
  "/Users/carlo/Documents/Apice HQ/Infra/Telas La Jalisciense/Respaldos/2026-10-30-antes-de-separar-merceria";
const PAGINA = 1000;

type Variante = {
  id: string;
  tela_id: string;
  sku: string | null;
  precio: number | null;
  unidad_venta?: string | null;
  revisado_en?: string | null;
  updated_at?: string | null;
};

const respaldo = resolve(
  process.argv.find((a) => a.startsWith("--respaldo="))?.slice(11) ?? RESPALDO_POR_DEFECTO
);
const archivo = join(respaldo, "datos", "variante.json");
if (!existsSync(archivo)) {
  console.error(`✖ No encuentro ${archivo}. Pasa --respaldo=<carpeta de pnpm respaldo:completo>.`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const llave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !llave) {
  console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL y una llave de Supabase en .env.local");
  process.exit(1);
}
const sb = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });

/** Paginada con `order`: sin orden, dos páginas se pueden encimar. */
async function leerTodo<T>(tabla: string, columnas: string): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await sb
      .from(tabla)
      .select(columnas)
      .order("id", { ascending: true })
      .range(desde, desde + PAGINA - 1);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    filas.push(...((data ?? []) as T[]));
    if ((data?.length ?? 0) < PAGINA) break;
  }
  return filas;
}

const vacio = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");
const fecha = (iso?: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "—");

async function main() {
  const antes = JSON.parse(readFileSync(archivo, "utf8")) as Variante[];
  const hoy = await leerTodo<Variante>(
    "variante",
    "id,tela_id,sku,precio,unidad_venta,revisado_en,updated_at"
  );
  const telas = await leerTodo<{ id: string; nombre: string; slug: string }>("tela", "id,nombre,slug");

  const nombreTela = new Map(telas.map((t) => [t.id, t.nombre]));
  const porId = new Map(hoy.map((v) => [v.id, v]));
  const etiqueta = (v: Variante) =>
    `${nombreTela.get(v.tela_id) ?? "(modelo borrado)"}${v.sku ? ` · ${v.sku}` : ""} · ${v.id}`;

  console.log(`Respaldo: ${respaldo}`);
  console.log(`Variantes en el respaldo: ${antes.length} · hoy: ${hoy.length}\n`);

  // 1. Precio o SKU que tenían valor y hoy están vacíos.
  const sinPrecio = antes.filter((a) => !vacio(a.precio) && porId.has(a.id) && vacio(porId.get(a.id)!.precio));
  const sinSku = antes.filter((a) => !vacio(a.sku) && porId.has(a.id) && vacio(porId.get(a.id)!.sku));
  const desaparecidas = antes.filter((a) => !porId.has(a.id));

  console.log(`1. Precio que se perdió desde el respaldo: ${sinPrecio.length}`);
  for (const a of sinPrecio) {
    const h = porId.get(a.id)!;
    console.log(`   - ${etiqueta(h)}\n     tenía $${a.precio} por ${a.unidad_venta ?? "metro"} · editada ${fecha(h.updated_at)}`);
  }

  console.log(`\n   SKU que se perdió desde el respaldo: ${sinSku.length}`);
  for (const a of sinSku) {
    const h = porId.get(a.id)!;
    console.log(`   - ${etiqueta(h)}\n     tenía SKU "${a.sku}" · editada ${fecha(h.updated_at)}`);
  }

  if (desaparecidas.length) {
    console.log(`\n   Variantes del respaldo que ya no existen: ${desaparecidas.length}`);
    for (const a of desaparecidas) {
      console.log(`   - ${nombreTela.get(a.tela_id) ?? "(modelo borrado)"} · ${a.id}${vacio(a.precio) ? "" : ` · tenía $${a.precio}`}`);
    }
  }

  // 2. Revisadas y sin precio: posibles víctimas anteriores al respaldo.
  const revisadasSinPrecio = hoy.filter((v) => !vacio(v.revisado_en) && vacio(v.precio));
  console.log(`\n2. Revisadas y sin precio (posible víctima previa al respaldo): ${revisadasSinPrecio.length}`);
  for (const v of revisadasSinPrecio) {
    const a = antes.find((x) => x.id === v.id);
    const enRespaldo = a ? (vacio(a.precio) ? "también vacía en el respaldo" : `en el respaldo tenía $${a.precio}`) : "no estaba en el respaldo";
    console.log(`   - ${etiqueta(v)}\n     revisada ${fecha(v.revisado_en)} · editada ${fecha(v.updated_at)} · ${enRespaldo}`);
  }

  const conPrecio = hoy.filter((v) => !vacio(v.precio)).length;
  console.log(`\nHoy: ${conPrecio} de ${hoy.length} variantes tienen precio.`);
  console.log("Solo lectura: no se escribió nada.");
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
