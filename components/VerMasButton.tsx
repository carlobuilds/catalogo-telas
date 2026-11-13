"use client";

import { useLinkStatus } from "next/link";
import { CircleNotch, Plus } from "@/components/ui/iconos";
import { LinkSinSalto } from "@/components/LinkSinSalto";

/**
 * "Ver más": un ENLACE real (se puede abrir en otra pestaña y funciona sin
 * JavaScript) que trae la siguiente tanda sin mover la página.
 *
 * Antes era un botón con `router.push(href, { scroll: false })` y aun así, en
 * producción, mandaba la página hasta arriba en cada toque: Next ignoraba el
 * `scroll: false` (ver `lib/navegacion.ts`). `LinkSinSalto` precarga la URL
 * exacta justo antes de navegar, que es lo que lo evita.
 *
 * No se precarga al aparecer en pantalla (`prefetch={true}`): eso renderizaría
 * 48 productos más a cada persona que llega al final, los pida o no.
 */
export function VerMasButton({ href, etiqueta }: { href: string; etiqueta: string }) {
  return (
    <LinkSinSalto
      href={href}
      prefetch={false}
      className="inline-flex min-h-14 items-center gap-2 rounded border border-outline-variant/40 bg-surface-container-lowest px-8 text-lg font-bold text-ink-display shadow-sm transition-all hover:bg-surface-container hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
    >
      <Contenido etiqueta={etiqueta} />
    </LinkSinSalto>
  );
}

/** Va DENTRO del enlace: `useLinkStatus` solo funciona en un hijo del `<Link>`. */
function Contenido({ etiqueta }: { etiqueta: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <CircleNotch className="size-6 animate-spin text-ink-display" />
      ) : (
        <Plus className="size-6 text-ink-display" />
      )}
      <span aria-live="polite">{pending ? "Cargando…" : etiqueta}</span>
    </>
  );
}
