#!/usr/bin/env tsx
/**
 * Respaldo COMPLETO de producción — Telas La Jalisciense
 * ===========================================================================
 * `pnpm respaldo` vuelca solo las seis tablas que tocan los scripts de
 * curaduría. Esto es lo que hace falta para poder reconstruir el catálogo
 * entero si algo sale mal: TODAS las tablas, las cuentas de admin/revisor y
 * cada objeto del bucket `telas` (originales y derivados).
 *
 *   pnpm respaldo:completo --destino=<carpeta>
 *
 * Deja en <carpeta>:
 *   datos/<tabla>.json      una por tabla, paginada en orden de llave primaria
 *   datos/auth_usuarios.json  id, correo y fechas (Supabase no expone contraseñas)
 *   catalogo.csv            la vista `catalogo_telas`, para abrirla en Excel
 *   fotos/<ruta>            copia byte a byte del bucket
 *   manifiesto.json         qué se bajó, con tamaños
 *   catalogo_telas_supabase.sql + LEEME.txt
 *
 * SOLO LEE: no escribe nada en la BD ni en el bucket. Es reanudable: un objeto
 * que ya está en disco con el mismo tamaño no se vuelve a bajar.
 *
 * Pagina SIEMPRE con `order`: sin orden, Postgres no garantiza que dos páginas
 * consecutivas no se encimen, y el respaldo podría duplicar o perder filas sin
 * que nadie lo note.
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 * (la service_role lee `movimiento_inventario`, que no tiene política pública).
 * ===========================================================================
 */
import { config as loadEnv } from "dotenv";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const BUCKET = "telas";
const PAGINA = 1000;
/**
 * Bajo a propósito. El plan de Supabase tiene pocas conexiones y el sitio en
 * vivo comparte esa misma base: con 8 en paralelo el listado se topó con
 * "Too many connections". Las fotos se bajan por la URL pública del CDN, que
 * no abre conexión a Postgres; el listado sí, por eso va en serie y reintenta.
 */
const DESCARGAS_EN_PARALELO = 4;
const REINTENTOS = 6;

/** Tabla → columnas de su llave primaria (el orden de paginación). */
const TABLAS: Record<string, string[]> = {
  tela: ["id"],
  variante: ["id"],
  foto: ["id"],
  color: ["id"],
  categoria: ["id"],
  acabado: ["id"],
  caso_uso: ["id"],
  oportunidad: ["id"],
  tela_caso_uso: ["tela_id", "caso_uso_id"],
  tela_oportunidad: ["tela_id", "oportunidad_id"],
  movimiento_inventario: ["id"],
  // Sección 16 del SQL: puede no existir todavía (ver TABLAS_OPCIONALES).
  tela_categoria: ["tela_id", "categoria_id"],
};

/**
 * Tablas de migraciones que Carlo corre a mano: si aún no existen, el
 * respaldo las omite y lo dice, en vez de reintentar seis veces y fallar.
 */
const TABLAS_OPCIONALES = new Set(["tela_categoria"]);

const destinoArg = process.argv.find((a) => a.startsWith("--destino="))?.slice(10);
if (!destinoArg) {
  console.error("Uso: pnpm respaldo:completo --destino=<carpeta>");
  process.exit(1);
}
const DESTINO = resolve(destinoArg);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !llave) {
  console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reintenta con espera creciente (1s, 2s, 4s…): los cortes de Supabase son pasajeros. */
async function conReintentos<T>(etiqueta: string, fn: () => Promise<T>): Promise<T> {
  for (let intento = 1; ; intento++) {
    try {
      return await fn();
    } catch (e) {
      if (intento >= REINTENTOS) throw e;
      const ms = 1000 * 2 ** (intento - 1);
      console.log(`   ↻ ${etiqueta}: ${e instanceof Error ? e.message : e} — reintento en ${ms / 1000}s`);
      await espera(ms);
    }
  }
}

function escribirJson(ruta: string, valor: unknown) {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(valor, null, 2));
}

async function leerTodo(origen: string, orden: string[]): Promise<Record<string, unknown>[]> {
  const filas: Record<string, unknown>[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    let q = sb.from(origen).select("*");
    for (const col of orden) q = q.order(col, { ascending: true });
    const data = await conReintentos(origen, async () => {
      const { data, error } = await q.range(desde, desde + PAGINA - 1);
      if (error) throw new Error(`${origen}: ${error.message}`);
      return data;
    });
    filas.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGINA) break;
  }
  return filas;
}

/** CSV que Excel abre bien: BOM UTF-8 para los acentos, comillas donde haga falta. */
function aCsv(filas: Record<string, unknown>[]): string {
  if (filas.length === 0) return "";
  const columnas = Object.keys(filas[0]);
  const celda = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [columnas.join(","), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(","))].join("\n");
}

type Objeto = { ruta: string; bytes: number };

/** Lista recursiva del bucket. En Storage, una entrada sin `id` es una carpeta. */
async function listarBucket(prefijo = ""): Promise<Objeto[]> {
  const objetos: Objeto[] = [];
  for (let offset = 0; ; offset += PAGINA) {
    const data = await conReintentos(`listar ${prefijo || "/"}`, async () => {
      const { data, error } = await sb.storage
        .from(BUCKET)
        .list(prefijo, { limit: PAGINA, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(error.message);
      return data;
    });
    for (const e of data ?? []) {
      const ruta = prefijo ? `${prefijo}/${e.name}` : e.name;
      if (e.id == null) objetos.push(...(await listarBucket(ruta)));
      else objetos.push({ ruta, bytes: Number(e.metadata?.size ?? -1) });
    }
    if ((data?.length ?? 0) < PAGINA) break;
  }
  return objetos;
}

/** URL pública del objeto; la ruta se codifica por segmento (hay espacios y acentos). */
function urlPublica(ruta: string): string {
  return `${url}/storage/v1/object/public/${BUCKET}/${ruta.split("/").map(encodeURIComponent).join("/")}`;
}

async function bajar(o: Objeto): Promise<"bajado" | "ya-estaba"> {
  const local = join(DESTINO, "fotos", o.ruta);
  if (existsSync(local) && statSync(local).size === o.bytes) return "ya-estaba";
  const bytes = await conReintentos(`bajar ${o.ruta}`, async () => {
    const r = await fetch(urlPublica(o.ruta));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  });
  mkdirSync(dirname(local), { recursive: true });
  writeFileSync(local, bytes);
  return "bajado";
}

async function main() {
  mkdirSync(DESTINO, { recursive: true });
  console.log(`Respaldo en ${DESTINO}\n`);

  // 1. Tablas
  console.log("1/4 Tablas");
  const conteos: Record<string, number> = {};
  const tablas: Record<string, Record<string, unknown>[]> = {};
  for (const [tabla, orden] of Object.entries(TABLAS)) {
    if (TABLAS_OPCIONALES.has(tabla)) {
      const { error } = await sb.from(tabla).select("*", { head: true, count: "exact" });
      if (error?.code === "PGRST205" || error?.code === "42P01") {
        console.log(`   ${tabla.padEnd(22)} (no existe aún: se omite)`);
        continue;
      }
    }
    const filas = await leerTodo(tabla, orden);
    tablas[tabla] = filas;
    conteos[tabla] = filas.length;
    escribirJson(join(DESTINO, "datos", `${tabla}.json`), filas);
    console.log(`   ${tabla.padEnd(22)} ${filas.length}`);
  }

  // 2. Cuentas
  console.log("2/4 Cuentas de admin/revisor");
  const usuarios: Record<string, unknown>[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: PAGINA });
    if (error) throw new Error(`auth: ${error.message}`);
    usuarios.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        confirmed_at: u.confirmed_at,
      }))
    );
    if (data.users.length < PAGINA) break;
  }
  conteos.auth_usuarios = usuarios.length;
  escribirJson(join(DESTINO, "datos", "auth_usuarios.json"), usuarios);
  console.log(`   auth_usuarios          ${usuarios.length}`);

  // 3. Vista legible
  console.log("3/4 Vista catalogo_telas → catalogo.csv");
  const vista = await leerTodo("catalogo_telas", ["tela_nombre", "variante_id"]);
  writeFileSync(join(DESTINO, "catalogo.csv"), aCsv(vista));
  conteos.catalogo_telas = vista.length;
  console.log(`   catalogo_telas         ${vista.length}`);

  // 4. Fotos
  console.log("4/4 Bucket `telas`");
  const objetos = await listarBucket();
  const bytesTotales = objetos.reduce((s, o) => s + Math.max(o.bytes, 0), 0);
  console.log(`   ${objetos.length} objetos, ${(bytesTotales / 1e6).toFixed(1)} MB`);
  let hechos = 0, bajados = 0;
  const cola = [...objetos];
  await Promise.all(
    Array.from({ length: DESCARGAS_EN_PARALELO }, async () => {
      for (let o = cola.shift(); o; o = cola.shift()) {
        if ((await bajar(o)) === "bajado") bajados++;
        if (++hechos % 100 === 0 || hechos === objetos.length)
          console.log(`   ${hechos}/${objetos.length}`);
      }
    })
  );

  // Verificación: todo lo listado está en disco con su tamaño, y toda foto de
  // la BD tiene su archivo. Si algo falla, el respaldo NO se da por bueno.
  const malos = objetos.filter((o) => {
    const local = join(DESTINO, "fotos", o.ruta);
    return !existsSync(local) || (o.bytes >= 0 && statSync(local).size !== o.bytes);
  });
  const enBucket = new Set(objetos.map((o) => o.ruta));
  const fotosSinArchivo = tablas.foto
    .map((f) => String(f.ruta ?? "").replace(/^\/+/, ""))
    .filter((r) => r && !enBucket.has(r));

  escribirJson(join(DESTINO, "manifiesto.json"), { objetos, fotosSinArchivo });
  copyFileSync("catalogo_telas_supabase.sql", join(DESTINO, "catalogo_telas_supabase.sql"));

  let commit = "desconocido";
  try { commit = execFileSync("git", ["rev-parse", "--short", "HEAD"]).toString().trim(); } catch {}
  writeFileSync(
    join(DESTINO, "LEEME.txt"),
    [
      `Respaldo completo de producción — ${new Date().toISOString()}`,
      `Commit del código: ${commit}`,
      "",
      "Filas por tabla:",
      ...Object.entries(conteos).map(([t, n]) => `  ${t.padEnd(24)} ${n}`),
      "",
      `Fotos: ${objetos.length} objetos del bucket \`${BUCKET}\`, ${(bytesTotales / 1e6).toFixed(1)} MB`,
      `Registros de \`foto\` cuyo archivo no está en el bucket: ${fotosSinArchivo.length}`,
      "",
      "Restaurar: el esquema está en catalogo_telas_supabase.sql; cada datos/<tabla>.json",
      "se puede reinsertar con upsert por llave primaria (primero los catálogos — color,",
      "categoria, acabado, caso_uso, oportunidad —, luego tela, variante, foto, las tablas",
      "puente (tela_caso_uso, tela_oportunidad, tela_categoria) y movimiento_inventario).",
      "fotos/ se sube tal cual al bucket `telas`.",
    ].join("\n")
  );

  console.log(`\n   bajados ahora: ${bajados}, ya estaban: ${objetos.length - bajados}`);
  if (fotosSinArchivo.length)
    console.log(`   ⚠ ${fotosSinArchivo.length} registros de foto apuntan a archivos que no existen en el bucket (ver manifiesto.json)`);
  if (malos.length) {
    console.error(`✖ ${malos.length} objetos no quedaron completos en disco; vuelve a correr el script`);
    process.exit(1);
  }
  console.log(`✓ Respaldo verificado: ${objetos.length} objetos completos y ${Object.keys(tablas).length} tablas`);
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
