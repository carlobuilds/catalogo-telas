"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CartDrawer } from "@/components/CartDrawer";
import { TutorialModal } from "@/components/tutorial/TutorialModal";
import { esRutaInterna } from "@/lib/rutas";

/**
 * Los elementos de VITRINA (salto al contenido, cabecera con cesta, barra
 * inferior del celular, la cesta y la guía para clientes) en un solo lugar,
 * para que ninguna herramienta interna los herede del layout raíz.
 *
 * Antes cada componente se escondía solo con un `if (pathname…) return null`
 * — pero la cesta y la guía no lo hacían, y la guía arma un temporizador para
 * abrirse sola: aparecía encima del formulario de /admin. Aquí no se montan
 * en absoluto, así que sus hooks y timers ni siquiera corren.
 *
 * El salto y su destino también viven aquí y no en el layout raíz: el panel
 * del admin trae los suyos (`ShellAdmin`), porque su menú va ANTES del
 * contenido, y dos `id="contenido"` en la página mandarían el salto al menú.
 */
export function ChromeTienda({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (esRutaInterna(pathname)) return <div className="flex-1">{children}</div>;

  return (
    <>
      {/* Primer elemento enfocable de la página: con teclado o lector de
          pantalla se salta el header sin recorrerlo. Vive fuera de pantalla
          y baja al recibir foco; no usa `sr-only`/`not-sr-only` porque el
          `padding: 0` de este último pelea con el del propio link. */}
      <a
        href="#contenido"
        className="fixed left-3 top-0 z-[70] inline-flex min-h-[44px] -translate-y-full items-center rounded bg-heritage-navy px-4 text-base font-bold text-white transition-transform focus:translate-y-[calc(0.75rem+env(safe-area-inset-top,0px))] focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      {/* Destino del salto. `tabIndex={-1}` para que reciba el foco sin
          entrar al orden de tabulación; se le quita el contorno en línea
          porque la regla global de `:focus-visible` (fuera de capa) le gana
          a cualquier utilidad, y un recuadro alrededor de la página entera
          no orienta a nadie: el foco sigue con el siguiente Tab. */}
      <div id="contenido" tabIndex={-1} className="flex-1" style={{ outline: "none" }}>
        {children}
      </div>
      {/* Lo que tapa la barra inferior fija (4rem + zona segura del iPhone):
          sin este hueco, lo último de cada página quedaba debajo de ella. */}
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom,0px))] shrink-0 sm:hidden" />
      <MobileBottomNav />
      <CartDrawer />
      <TutorialModal />
    </>
  );
}
