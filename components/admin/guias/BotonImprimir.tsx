"use client";

import { Printer } from "@/components/ui/iconos";

export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-2 rounded bg-heritage-navy px-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-deep-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy focus-visible:ring-offset-2 print:hidden"
    >
      <Printer className="size-5" aria-hidden />
      Imprimir
    </button>
  );
}
