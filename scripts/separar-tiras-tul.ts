#!/usr/bin/env tsx
/**
 * Saca las tiras de tul bordado de la categoría de TELA — Telas La Jalisciense
 * ===========================================================================
 * "Tul Bordado" juntaba dos cosas distintas: el tul bordado de rollo (tela) y
 * las tiras angostas de tul bordado que se cosen de orilla (avío). Con el
 * catálogo partido en Telas y Mercería, las tiras salían en Telas. Este
 * script las pasa a su propia categoría, "Tira de tul bordado", que
 * `lib/catalogos.ts` manda a Mercería.
 *
 *   pnpm separar:tiras-tul                                → SIMULACRO, no escribe
 *   pnpm separar:tiras-tul --aplicar --respaldo=<carpeta> → escribe
 *
 * SOLO cambia `tela.categoria_id` (y crea la categoría si no existe). No toca
 * precio, SKU, existencia, fotos ni `revisado_en`: lo capturado en /revision
 * y /admin queda igual. Antes de escribir guarda en la carpeta del respaldo
 * `deshacer-tiras-tul.json` con la categoría anterior de cada modelo.
 *
 * Qué es tira: los modelos de "tul-bordado" cuyo nombre empieza con "Tira".
 * El tul bordado de rollo ("Tul Bordado", "Tul Bordado Margarita") se queda.
 *
 * Idempotente: la segunda corrida no encuentra nada que mover.
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 * ===========================================================================
 */
import { config as loadEnv } from "dotenv";
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIAS } from "../lib/ingesta/categorias";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const APLICAR = process.argv.includes("--aplicar");
const RESPALDO = process.argv.find((a) => a.startsWith("--respaldo="))?.slice(11);

const ORIGEN = CATEGORIAS.TUL_BORDADO;
const DESTINO = CATEGORIAS.TIRA_TUL_BORDADO;
const ES_TIRA = /^tira\b/i;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }
  // Escribir sin un respaldo a la mano no es opción: el deshacer va ahí.
  if (APLICAR && (!RESPALDO || !existsSync(join(resolve(RESPALDO), "datos", "tela.json")))) {
    console.error("✖ --aplicar exige --respaldo=<carpeta> de un `pnpm respaldo:completo` (con datos/tela.json)");
    process.exit(1);
  }
  const sb = createClient(url, llave, { auth: { persistSession: false } });

  const { data: cats, error: eCats } = await sb
    .from("categoria")
    .select("id,slug,nombre")
    .in("slug", [ORIGEN.slug, DESTINO.slug]);
  if (eCats) throw new Error(eCats.message);
  const origen = cats?.find((c) => c.slug === ORIGEN.slug);
  let destino = cats?.find((c) => c.slug === DESTINO.slug);
  if (!origen) {
    console.log(`No existe la categoría "${ORIGEN.slug}": no hay nada que mover.`);
    return;
  }

  const { data: telas, error: eTelas } = await sb
    .from("tela")
    .select("id,nombre,slug,categoria_id")
    .eq("categoria_id", origen.id)
    .order("nombre");
  if (eTelas) throw new Error(eTelas.message);

  const tiras = (telas ?? []).filter((t) => ES_TIRA.test(t.nombre.trim()));
  const seQuedan = (telas ?? []).filter((t) => !ES_TIRA.test(t.nombre.trim()));

  console.log(`${APLICAR ? "APLICANDO" : "SIMULACRO"} — "${ORIGEN.nombre}" → "${DESTINO.nombre}"\n`);
  console.log(`Se mueven ${tiras.length}:`);
  for (const t of tiras) console.log(`   → ${t.nombre}`);
  console.log(`\nSe quedan en ${ORIGEN.nombre} (${seQuedan.length}):`);
  for (const t of seQuedan) console.log(`   · ${t.nombre}`);

  if (tiras.length === 0) {
    console.log("\n✓ Nada pendiente.");
    return;
  }
  if (!APLICAR) {
    console.log("\nSimulacro: no se escribió nada. Corre con --aplicar --respaldo=<carpeta> para aplicar.");
    return;
  }

  const deshacer = join(resolve(RESPALDO!), "deshacer-tiras-tul.json");
  writeFileSync(
    deshacer,
    JSON.stringify(
      { fecha: new Date().toISOString(), categoriaAnterior: origen, telas: tiras },
      null,
      2
    )
  );
  console.log(`\n   deshacer guardado en ${deshacer}`);

  if (!destino) {
    const { data, error } = await sb
      .from("categoria")
      .upsert({ nombre: DESTINO.nombre, slug: DESTINO.slug }, { onConflict: "slug" })
      .select("id,slug,nombre")
      .single();
    if (error) throw new Error(error.message);
    destino = data;
    console.log(`   + categoría "${DESTINO.nombre}" creada`);
  }

  const { error: eUpd, count } = await sb
    .from("tela")
    .update({ categoria_id: destino!.id }, { count: "exact" })
    .in("id", tiras.map((t) => t.id))
    .eq("categoria_id", origen.id);
  if (eUpd) throw new Error(eUpd.message);
  console.log(`✓ ${count} modelos movidos a "${DESTINO.nombre}"`);
  console.log("   El catálogo se refresca solo en ≤60 s (caché de lectura).");
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
