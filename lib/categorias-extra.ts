/**
 * "También aparece en": categorías EXTRA de un producto (tabla
 * `tela_categoria`, sección 16 del SQL). Las usan /admin y /revision.
 * ===========================================================================
 * La tabla llega con una migración que Carlo corre a mano, así que todo aquí
 * tolera que todavía no exista: leer devuelve `faltaMigracion` y escribir
 * devuelve un mensaje claro en vez de tumbar la página.
 */
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export const FALTA_MIGRACION_EXTRAS =
  "Falta correr la migración de categorías extra (sql/2026-10-31-categorias-extra.sql).";

/** 42P01 = la tabla no existe (Postgres); PGRST205 = PostgREST no la ve en su esquema. */
export function esTablaFaltante(codigo: string | undefined): boolean {
  return codigo === "42P01" || codigo === "PGRST205";
}

export async function leerCategoriasExtra(
  supabase: Admin,
  telaId: string
): Promise<{ ids: string[]; faltaMigracion: boolean; error?: string }> {
  const { data, error } = await supabase.from("tela_categoria").select("categoria_id").eq("tela_id", telaId);
  if (esTablaFaltante(error?.code)) return { ids: [], faltaMigracion: true };
  if (error) return { ids: [], faltaMigracion: false, error: error.message };
  return { ids: (data ?? []).map((f) => f.categoria_id as string), faltaMigracion: false };
}

/**
 * Reemplazo completo del conjunto, como `casos_uso` en /admin: lo marcado en
 * el formulario es la verdad. Solo toca `tela_categoria` de ESTE producto.
 */
export async function reemplazarCategoriasExtra(
  supabase: Admin,
  telaId: string,
  categoriaIds: string[]
): Promise<{ error?: string }> {
  const { error: errorBorrar } = await supabase.from("tela_categoria").delete().eq("tela_id", telaId);
  if (esTablaFaltante(errorBorrar?.code)) return { error: FALTA_MIGRACION_EXTRAS };
  if (errorBorrar) return { error: `No se pudieron guardar las categorías extra: ${errorBorrar.message}` };

  const unicas = [...new Set(categoriaIds)];
  if (unicas.length === 0) return {};
  const { error } = await supabase
    .from("tela_categoria")
    .insert(unicas.map((categoria_id) => ({ tela_id: telaId, categoria_id })));
  if (error) return { error: `No se pudieron guardar las categorías extra: ${error.message}` };
  return {};
}
