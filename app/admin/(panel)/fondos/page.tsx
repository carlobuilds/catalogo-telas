import { exigirAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { PanelFondos, leerTandaFondos } from "@/components/admin/fondos/PanelFondos";
import { esTablaFaltante } from "@/lib/categorias-extra";
import { interruptorEncendido } from "@/lib/fondo-blanco";
import { fichasDeFondos, leerFiltroFondos, type FilaFondo } from "@/lib/admin/fondos";

const TAM_PAGINA = 1000;

export const metadata = { title: "Fondos de foto — Telas La Jalisciense" };

export default async function FondosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // El layout no vuelve a correr en navegaciones parciales.
  await exigirAdmin();
  const params = await searchParams;
  const supabase = createAdminClient();

  const { data: ajuste, error: errorAjuste } = await supabase
    .from("ajuste_tienda")
    .select("valor")
    .eq("clave", "fondo_blanco")
    .maybeSingle();

  const filas: FilaFondo[] = [];
  let errorLectura = errorAjuste;
  if (!errorLectura) {
    for (let desde = 0; ; desde += TAM_PAGINA) {
      const { data, error } = await supabase
        .from("foto_mascara")
        .select(
          "foto_id,ruta_sm,activa,revisada_en,fuente_generado_en,generado_en,pct_transicion," +
            "foto!inner(ruta,derivados,variante:variante_id(color:color_id(nombre),tela:tela_id(id,nombre)))"
        )
        .order("foto_id")
        .range(desde, desde + TAM_PAGINA - 1);
      if (error) {
        errorLectura = error;
        break;
      }
      filas.push(...((data ?? []) as unknown as FilaFondo[]));
      if ((data ?? []).length < TAM_PAGINA) break;
    }
  }

  if (errorLectura) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <EncabezadoPagina titulo="Fondos de foto" />
        <p role="alert" className="rounded-lg border border-line bg-surface-container-lowest p-4 text-base text-ink-text">
          {esTablaFaltante(errorLectura.code)
            ? "Esta función todavía no está activada: falta correr la migración sql/2026-11-03-fondo-blanco.sql."
            : `No se pudieron leer las fotos: ${errorLectura.message}`}
        </p>
      </main>
    );
  }

  const { count } = await supabase.from("foto").select("id", { count: "exact", head: true });

  return (
    <PanelFondos
      activo={interruptorEncendido(ajuste?.valor)}
      fichas={fichasDeFondos(filas)}
      totalFotos={count ?? 0}
      filtro={leerFiltroFondos(params.filtro)}
      hasta={leerTandaFondos(params.ver)}
    />
  );
}
