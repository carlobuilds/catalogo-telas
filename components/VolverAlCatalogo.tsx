"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * `router.back()` en vez de `Link href="/"`: reproduce la navegación previa
 * tal cual (filtros, `?ver=`, scroll) porque reutiliza la entrada de
 * historial existente. Un `Link` a "/" siempre manda a la portada limpia,
 * sin importar de dónde vino el cliente.
 *
 * Si no hay historial propio (llegó por un link compartido, nueva pestaña),
 * `history.length` es 1 y `back()` no tendría a dónde ir — ahí cae al
 * catálogo DEL PRODUCTO (`href`): una bolsita de piedras regresa a Mercería
 * aunque la portada algún día sea Telas.
 */
export function VolverAlCatalogo({ href, nombre }: { href: string; nombre: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(href);
        }
      }}
      className="mb-6 inline-flex min-h-[44px] items-center gap-2 rounded border border-outline-variant/40 bg-surface-container-lowest px-4 text-sm font-bold text-ink-display shadow-xs transition-all hover:bg-surface-container active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Volver a {nombre}
    </button>
  );
}
