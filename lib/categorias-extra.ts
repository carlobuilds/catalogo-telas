/**
 * "También aparece en": categorías EXTRA de un producto (tabla
 * `tela_categoria`, sección 16 del SQL). Las usan /admin y /revision.
 * ===========================================================================
 * La tabla llega con una migración que Carlo corre a mano, así que todo aquí
 * tolera que todavía no exista: leer devuelve un aviso y escribir devuelve un
 * mensaje claro en vez de tumbar la página.
 *
 * Falla CERRADO: si las extras no se pudieron leer (falta la tabla o
 * cualquier otro error), la pantalla muestra el aviso y NO pinta las casillas.
 * Pintarlas vacías haría que guardar borrara las que sí existen.
 */
import type { createAdminClient } from "@/lib/supabase/admin";
import { categoriasExtraPosibles } from "@/lib/catalogos";

type Admin = ReturnType<typeof createAdminClient>;

export const FALTA_MIGRACION_EXTRAS =
  "Falta correr la migración de categorías extra (sql/2026-10-31-categorias-extra.sql).";

/** 42P01 = la tabla no existe (Postgres); PGRST205 = PostgREST no la ve en su esquema. */
export function esTablaFaltante(codigo: string | undefined): boolean {
  return codigo === "42P01" || codigo === "PGRST205";
}

/**
 * Las extras actuales de un producto. `aviso` no nulo = no se sabe cuáles
 * son: la pantalla lo muestra en lugar del formulario.
 */
export async function leerCategoriasExtra(
  supabase: Admin,
  telaId: string
): Promise<{ ids: string[]; aviso: string | null }> {
  const { data, error } = await supabase.from("tela_categoria").select("categoria_id").eq("tela_id", telaId);
  if (esTablaFaltante(error?.code)) return { ids: [], aviso: FALTA_MIGRACION_EXTRAS };
  if (error) return { ids: [], aviso: `No se pudieron leer las categorías extra: ${error.message}. Recarga la página.` };
  return { ids: (data ?? []).map((f) => f.categoria_id as string), aviso: null };
}

/**
 * Deja las extras del producto en `pedidas` —lo marcado en el formulario es
 * la verdad, como `casos_uso` en /admin— sin pasar nunca por "cero extras":
 *   1. valida: solo categorías que existen y son del MISMO catálogo que la
 *      principal (un POST puede traer cualquier cosa);
 *   2. inserta las nuevas;
 *   3. y solo entonces quita las desmarcadas.
 * Si algo falla a medio camino, lo que ya estaba marcado sigue ahí.
 * Solo toca `tela_categoria` de ESTE producto.
 */
export async function reemplazarCategoriasExtra(
  supabase: Admin,
  telaId: string,
  pedidas: string[],
  principalId: string | null
): Promise<{ error?: string }> {
  const consultar = [...new Set([...pedidas, ...(principalId ? [principalId] : [])])];
  let validas: string[] = [];
  if (consultar.length) {
    const { data: categorias, error } = await supabase.from("categoria").select("id, slug").in("id", consultar);
    if (error) return { error: `No se pudieron validar las categorías: ${error.message}` };
    const lista = (categorias ?? []) as { id: string; slug: string }[];
    const principal = lista.find((c) => c.id === principalId)?.slug ?? null;
    validas = categoriasExtraPosibles(
      lista.filter((c) => pedidas.includes(c.id)),
      principal
    ).map((c) => c.id);
  }

  const actuales = await leerCategoriasExtra(supabase, telaId);
  if (actuales.aviso) return { error: actuales.aviso };

  const agregar = validas.filter((id) => !actuales.ids.includes(id));
  const quitar = actuales.ids.filter((id) => !validas.includes(id));

  if (agregar.length) {
    const { error } = await supabase
      .from("tela_categoria")
      .insert(agregar.map((categoria_id) => ({ tela_id: telaId, categoria_id })));
    if (error) return { error: `No se pudieron guardar las categorías extra: ${error.message}` };
  }
  if (quitar.length) {
    const { error } = await supabase
      .from("tela_categoria")
      .delete()
      .eq("tela_id", telaId)
      .in("categoria_id", quitar);
    if (error) return { error: `No se pudieron quitar las categorías extra: ${error.message}` };
  }
  return {};
}
