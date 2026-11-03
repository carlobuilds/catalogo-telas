import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { crearTela } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Nueva tela — Admin",
  robots: { index: false, follow: false },
};

/**
 * Alta de un modelo (tela). Solo pide lo esencial; al guardar redirige al
 * editor completo (/admin/tela/[id]) donde se agregan variantes y fotos.
 * La URL (slug) se genera del nombre en el servidor: menos campos, menos errores.
 */
export default async function NuevaTelaPage() {
  await exigirAdmin();

  const supabase = createAdminClient();
  const { data: categorias } = await supabase
    .from("categoria")
    .select("id, nombre")
    .order("nombre");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <EncabezadoPagina titulo="Nueva tela" descripcion="Crea el modelo; los colores se agregan en la siguiente pantalla." />

      <form
        action={crearTela}
        className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-sm"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Nombre *</span>
          <input
            type="text"
            name="nombre"
            required
            placeholder="Ej. Chifón Lunares"
            className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          />
          <span className="mt-1 block text-xs text-ink/50">
            La URL pública (/tela/…) se genera automáticamente del nombre.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Categoría</span>
          <select
            name="categoria_id"
            defaultValue=""
            className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          >
            <option value="">— Sin categoría —</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Descripción</span>
          <textarea
            name="descripcion"
            rows={3}
            placeholder="Caída, textura, usos recomendados…"
            className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          />
        </label>

        <SubmitButton label="Crear tela y agregar variantes" pendingLabel="Creando…" atajo="guardar" />
      </form>
    </main>
  );
}
