import type { ReactNode } from "react";
import { NavAdmin } from "@/components/admin/NavAdmin";
import { AtajosAdmin } from "@/components/admin/AtajosAdmin";

/**
 * Marco de todas las pantallas del admin: menú de módulos, atajos de teclado
 * y el enlace "Saltar al contenido" para quien navega con teclado o lector
 * de pantalla (sin él hay que tabular por todo el menú en cada página).
 */
export function ShellAdmin({ email, children }: { email: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-sand-bg lg:flex print:block print:min-h-0 print:bg-white">
      <a
        href="#contenido"
        className="sr-only z-50 rounded bg-heritage-navy px-4 py-3 text-base font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <NavAdmin email={email} />
      <div id="contenido" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        {children}
      </div>
      <AtajosAdmin />
    </div>
  );
}
