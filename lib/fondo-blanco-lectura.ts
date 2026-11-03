import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { esTablaFaltante } from "@/lib/categorias-extra";
import {
  FONDO_BLANCO_APAGADO,
  type EstadoFondoBlanco,
  type FilaMascaraConFoto,
  indiceDeMascaras,
  interruptorEncendido,
} from "@/lib/fondo-blanco";

const TAM_PAGINA = 1000;

/**
 * Lee el interruptor y, solo si está prendido, las máscaras encendidas: apagado
 * no cuesta más que una fila. La raíz de la consulta es `foto_mascara` y no `foto`
 * porque, si la migración no ha corrido, una raíz en `foto` da PGRST200 en vez del
 * "tabla faltante" que aquí significa apagado. RLS ya limita la lectura pública a
 * las máscaras encendidas.
 *
 * Lanza en cualquier otro error para que `unstable_cache` no lo guarde 60 s.
 */
const leerFondoBlancoCached = unstable_cache(
  async (): Promise<EstadoFondoBlanco> => {
    const supabase = createPublicClient();

    const { data: ajuste, error: errorAjuste } = await supabase
      .from("ajuste_tienda")
      .select("valor")
      .eq("clave", "fondo_blanco")
      .maybeSingle();
    if (esTablaFaltante(errorAjuste?.code)) return FONDO_BLANCO_APAGADO;
    if (errorAjuste) throw new Error(errorAjuste.message);
    if (!interruptorEncendido(ajuste?.valor)) return FONDO_BLANCO_APAGADO;

    const filas: FilaMascaraConFoto[] = [];
    for (let desde = 0; ; desde += TAM_PAGINA) {
      const { data, error } = await supabase
        .from("foto_mascara")
        .select("ruta_sm,fuente_generado_en,generado_en,foto!inner(variante_id,ruta,derivados)")
        .order("foto_id")
        .range(desde, desde + TAM_PAGINA - 1);
      if (esTablaFaltante(error?.code)) return FONDO_BLANCO_APAGADO;
      if (error) throw new Error(error.message);
      filas.push(...((data ?? []) as unknown as FilaMascaraConFoto[]));
      if ((data ?? []).length < TAM_PAGINA) break;
    }
    return { activo: true, mascaras: indiceDeMascaras(filas) };
  },
  ["fondo-blanco"],
  { revalidate: 60, tags: ["catalogo"] }
);

/**
 * Estado del fondo blanco. Nunca lanza hacia la página: ante cualquier falla el
 * catálogo se ve con sus fotos originales, que es como se veía antes de esto.
 */
export const getFondoBlanco = cache(async (): Promise<EstadoFondoBlanco> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return FONDO_BLANCO_APAGADO;
  }
  try {
    return await leerFondoBlancoCached();
  } catch {
    return FONDO_BLANCO_APAGADO;
  }
});
