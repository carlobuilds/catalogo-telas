"use client";

import { useRouter } from "next/navigation";
import { X } from "@/components/ui/iconos";
import { ATAJOS } from "@/lib/atajos";
import { useAtajos } from "@/components/admin/useAtajos";
import { moduloDeAtajo } from "@/components/admin/modulos";

const ID_AYUDA = "ayuda-atajos";

/** Abre la lista de atajos (la tecla `?` o el botón del menú). */
export function abrirAyudaAtajos() {
  const dialogo = document.getElementById(ID_AYUDA);
  if (dialogo instanceof HTMLDialogElement && !dialogo.open) dialogo.showModal();
}

/**
 * Atiende los atajos de TODO el panel (lo monta `ShellAdmin` una sola vez) y
 * pinta su ayuda.
 *
 * Las páginas no se registran: marcan sus botones con `data-atajo="guardar"`,
 * `"guardar-otro"`, `"cancelar"` y su buscador con `data-atajo="buscar"`, y
 * aquí se buscan al momento de la tecla. Así una página nueva gana F10 con
 * solo marcar su botón.
 */
export function AtajosAdmin() {
  const router = useRouter();

  useAtajos({
    nuevo: () => router.push(moduloDeAtajo("nuevo")?.href ?? "/admin"),
    entradas: () => router.push(moduloDeAtajo("entradas")?.href ?? "/admin"),
    buscar: () => {
      const campo = document.querySelector<HTMLInputElement>('[data-atajo="buscar"]');
      if (campo) {
        campo.focus();
        campo.select();
      } else {
        router.push("/admin?buscar=1");
      }
    },
    // Siempre `true`: aunque no haya qué guardar, Ctrl+S no debe abrir el
    // "Guardar página como…" del navegador en medio de una captura.
    guardar: () => {
      botonDe("guardar")?.click();
      return true;
    },
    "guardar-otro": () => clicSiHay("guardar-otro"),
    cancelar: () => clicSiHay("cancelar"),
    ayuda: abrirAyudaAtajos,
  });

  return (
    <dialog
      id={ID_AYUDA}
      aria-labelledby={`${ID_AYUDA}-titulo`}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface-container-lowest p-0 text-ink-text shadow-xl backdrop:bg-ink-deep/60"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id={`${ID_AYUDA}-titulo`} className="text-xl font-bold text-ink-display">
          Atajos de teclado
        </h2>
        <form method="dialog">
          <button
            type="submit"
            aria-label="Cerrar"
            className="flex size-11 items-center justify-center rounded text-ink-soft hover:bg-surface-container hover:text-ink-display"
          >
            <X className="size-6" />
          </button>
        </form>
      </div>
      <table className="w-full text-left text-base">
        <caption className="sr-only">Teclas y lo que hace cada una</caption>
        <thead>
          <tr className="border-b border-line text-sm text-ink-soft">
            <th scope="col" className="px-5 py-2 font-semibold">Tecla</th>
            <th scope="col" className="px-5 py-2 font-semibold">Qué hace</th>
          </tr>
        </thead>
        <tbody>
          {ATAJOS.map((a) => (
            <tr key={a.accion} className="border-b border-line/60 last:border-0">
              <td className="whitespace-nowrap px-5 py-3">
                {a.teclas.map((t, i) => (
                  <span key={t}>
                    {i > 0 && <span className="px-1 text-sm text-ink-soft">o</span>}
                    <kbd className="rounded border border-line bg-surface-container px-2 py-0.5 font-sans text-sm font-semibold text-ink-display">
                      {t}
                    </kbd>
                  </span>
                ))}
              </td>
              <td className="px-5 py-3 text-ink-text">{a.descripcion}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-5 py-4 text-sm text-ink-soft">
        En Mac, <strong className="font-semibold text-ink-display">⌘ + S</strong> también guarda.
        Todos los atajos tienen además su botón en pantalla.
      </p>
    </dialog>
  );
}

/**
 * El botón marcado con esa acción. Si hay varios formularios (el editor tiene
 * uno por color), gana el del campo donde está el cursor; sin cursor en
 * ningún formulario solo se actúa si el botón es único, para no guardar el
 * color equivocado.
 */
function botonDe(accion: string): HTMLElement | null {
  const visibles = [...document.querySelectorAll<HTMLElement>(`[data-atajo="${accion}"]`)].filter(
    (b) => b.getClientRects().length > 0
  );
  const formActivo = document.activeElement?.closest("form");
  return (
    visibles.find((b) => formActivo && b.closest("form") === formActivo) ??
    (visibles.length === 1 ? visibles[0] : null)
  );
}

function clicSiHay(accion: string): boolean {
  const boton = botonDe(accion);
  if (!boton) return false;
  boton.click();
  return true;
}
