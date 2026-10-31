"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { GuardadoFeedback } from "@/components/revision/GuardadoFeedback";
import { actualizarCategoriasExtra, type EstadoGuardado } from "@/app/revision/actions";
import type { CategoriaLookup } from "@/components/revision/CategoriaProductoForm";

/**
 * "También aparece en": categorías EXTRA del producto, junto al selector de
 * la principal. Un producto sale en su categoría principal y, además, en las
 * que se marquen aquí (una aplicación de flores en Pedrería y en Flores).
 *
 * Mismo patrón que `CategoriaProductoForm`: su propio form y su propio botón,
 * invocado a mano para que un error se pinte junto al campo y no tumbe la
 * pantalla. Sin la migración (sección 16 del SQL) solo muestra el aviso.
 */
export function CategoriasExtraForm({
  telaId,
  opciones,
  marcadas,
  avisoMigracion,
}: {
  telaId: string;
  /** Solo las del mismo catálogo que la principal (`categoriasExtraPosibles`). */
  opciones: CategoriaLookup[];
  marcadas: string[];
  /** El texto de "falta correr la migración", o null si la tabla ya existe. */
  avisoMigracion: string | null;
}) {
  const [estado, setEstado] = useState<EstadoGuardado | null>(null);
  const [pendiente, startTransition] = useTransition();

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(async () => {
      setEstado(await actualizarCategoriasExtra(datos));
    });
  }

  return (
    <fieldset className="mt-4 border-t border-line pt-4">
      <legend className="sr-only">También aparece en</legend>
      <p className="text-sm font-semibold text-ink-display" aria-hidden>
        También aparece en
      </p>
      <p className="mb-2 text-sm text-ink-soft">
        Marca otras categorías donde la clientela también debería encontrar este producto.
      </p>

      {avisoMigracion ? (
        <p className="rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-ink">{avisoMigracion}</p>
      ) : (
        <form onSubmit={guardar} className="space-y-3">
          <input type="hidden" name="tela_id" value={telaId} />
          <div className="flex flex-wrap gap-2">
            {opciones.map((c) => (
              <label
                key={c.id}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded border border-line bg-bg px-3 text-sm text-ink transition-colors hover:bg-surface-high has-[:checked]:border-amber has-[:checked]:bg-amber/10"
              >
                <input
                  type="checkbox"
                  name="categorias_extra"
                  value={c.id}
                  defaultChecked={marcadas.includes(c.id)}
                  className="h-5 w-5 rounded border-line accent-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                />
                {c.nombre}
              </label>
            ))}
          </div>
          <SubmitButton label="Guardar" pendingLabel="Guardando…" size="sm" pending={pendiente} />
          <GuardadoFeedback estado={estado} />
        </form>
      )}
    </fieldset>
  );
}
