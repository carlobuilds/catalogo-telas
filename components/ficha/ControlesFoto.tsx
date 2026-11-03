"use client";

import { Check, MagnifyingGlassPlus } from "@/components/ui/iconos";

const BOTON =
  "inline-flex min-h-[44px] items-center gap-2 rounded border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy";
const APAGADO = "border-outline-variant bg-surface-container-lowest text-ink-display hover:border-heritage-navy";
const PRENDIDO = "border-heritage-navy bg-heritage-navy text-white hover:bg-deep-slate";

/**
 * Fila bajo la foto de la ficha. Va abajo y no encima: aquí el color es el producto
 * y nada debe taparlo. El botón de zoom es la invitación misma y siempre está a la
 * vista, en vez de un aviso que se esfuma antes de que alguien lo lea.
 */
export function ControlesFoto({
  onAcercar,
  conMascara,
  fondoBlanco,
  onCambiarFondo,
}: {
  /** Sin él no se ofrece: la foto no tiene más detalle que mostrar. */
  onAcercar?: () => void;
  conMascara: boolean;
  fondoBlanco: boolean;
  onCambiarFondo: () => void;
}) {
  if (!onAcercar && !conMascara) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {onAcercar && (
        <button type="button" onClick={onAcercar} className={`${BOTON} ${APAGADO}`}>
          <MagnifyingGlassPlus className="size-5" aria-hidden />
          Acercar para ver mejor
        </button>
      )}
      {conMascara && (
        <button
          type="button"
          onClick={onCambiarFondo}
          aria-pressed={fondoBlanco}
          className={`${BOTON} ${fondoBlanco ? PRENDIDO : APAGADO}`}
        >
          {fondoBlanco && <Check className="size-5" aria-hidden />}
          Ver en fondo blanco
        </button>
      )}
    </div>
  );
}
