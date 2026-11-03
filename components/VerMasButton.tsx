"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Plus } from "@/components/ui/iconos";

/**
 * Mismo patrón que ColorSelector.tsx: useTransition en vez de un <Link>
 * normal. La navegación reutiliza el mismo contenido montado (React no
 * vuelve a mostrar loading.tsx para transiciones dentro de la misma ruta),
 * así que sin esto el click no da ninguna señal hasta que los productos
 * nuevos aparecen de golpe.
 */
export function VerMasButton({ href, etiqueta }: { href: string; etiqueta: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          router.push(href, { scroll: false });
        });
      }}
      className="inline-flex min-h-14 items-center gap-2 rounded border border-outline-variant/40 bg-surface-container-lowest px-8 text-lg font-bold text-ink-display shadow-sm transition-all hover:bg-surface-container hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:cursor-wait disabled:opacity-70"
    >
      {isPending ? (
        <CircleNotch className="size-6 animate-spin text-ink-display" />
      ) : (
        <Plus className="size-6 text-ink-display" />
      )}
      {isPending ? "Cargando…" : etiqueta}
    </button>
  );
}
