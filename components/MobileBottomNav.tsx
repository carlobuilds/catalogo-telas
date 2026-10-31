"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store";
import { useGuideStore } from "@/lib/guide-store";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state.items);
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const openTutorial = useGuideStore((state) => state.openTutorial);

  useEffect(() => {
    setMounted(true);
  }, []);

  const itemCount = items.length;
  // Inactivo en `text-ink-soft` lleno (5.5:1 sobre el fondo): el `/70` que
  // tenía antes daba 2.97:1, por debajo de AA para texto de 12px.
  const inactivo = "text-ink-soft hover:text-ink-display";
  // Una sola pestaña para los dos catálogos: el selector Mercería | Telas de
  // la barra del catálogo hace la separación, y abajo no cabe otra pestaña.
  const isCatalogo =
    pathname === "/" ||
    pathname === "/telas" ||
    pathname === "/merceria" ||
    pathname.startsWith("/tela/");
  const isInspiracion = pathname === "/inspiracion";

  // /admin y /revision son herramientas internas: esta barra fija (Catálogo,
  // Inspiración, Cesta) no aplica y su `fixed bottom-0` chocaría con los
  // botones/sheets propios de esas pantallas.
  if (pathname.startsWith("/admin") || pathname.startsWith("/revision")) return null;

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="fixed bottom-0 left-0 right-0 z-40 block border-t border-line/60 bg-sand-bg/90 pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:hidden"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {/* Tab 1: Catálogo */}
        <Link
          href="/"
          className={`flex min-h-[44px] min-w-[64px] flex-col items-center justify-center transition-colors active:scale-95 ${
            isCatalogo ? "text-ink-display font-bold" : inactivo
          }`}
          aria-current={isCatalogo ? "page" : undefined}
        >
          <span aria-hidden className="material-symbols-outlined text-[22px]">grid_view</span>
          <span className="mt-0.5 text-xs">Catálogo</span>
          {/* El morado no va en texto, así que la pestaña activa se marca con
              un punto de relleno: sin él, activo e inactivo solo se distinguen
              por peso y eso casi no se ve a 12px. */}
          <span
            aria-hidden
            className={`mt-1 h-1 w-1 rounded-full ${isCatalogo ? "bg-heritage-navy" : "bg-transparent"}`}
          />
        </Link>

        {/* Tab 2: Inspiración */}
        <Link
          href="/inspiracion"
          className={`flex min-h-[44px] min-w-[64px] flex-col items-center justify-center transition-colors active:scale-95 ${
            isInspiracion ? "text-ink-display font-bold" : inactivo
          }`}
          aria-current={isInspiracion ? "page" : undefined}
        >
          <span aria-hidden className="material-symbols-outlined text-[22px]">auto_awesome</span>
          <span className="mt-0.5 text-xs">Inspiración</span>
          <span
            aria-hidden
            className={`mt-1 h-1 w-1 rounded-full ${isInspiracion ? "bg-heritage-navy" : "bg-transparent"}`}
          />
        </Link>

        {/* Tab 3: Cesta / Cotización.
            Sin `aria-label`: el nombre accesible sale del texto visible
            ("Cesta") para que quien navega por voz pueda decir lo que ve. El
            conteo del globo se oculta (es un número suelto) y se repite en
            palabras, DESPUÉS de "Cesta", para que el nombre siga empezando
            por la etiqueta visible: "Cesta, 3 artículos". */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`relative flex min-h-[44px] min-w-[64px] flex-col items-center justify-center transition-colors active:scale-95 ${inactivo}`}
        >
          <span className="relative">
            <span aria-hidden className="material-symbols-outlined text-[22px]">shopping_bag</span>
            {mounted && itemCount > 0 && (
              <span
                aria-hidden
                className="absolute -right-2.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1 text-xs font-bold text-white shadow-xs"
              >
                {itemCount}
              </span>
            )}
          </span>
          <span className="mt-0.5 text-xs">Cesta</span>
          {mounted && itemCount > 0 && (
            <span className="sr-only">
              , {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
            </span>
          )}
          {/* Cesta y Ayuda abren paneles, nunca son "página actual": el punto va
              transparente solo para que los cuatro iconos queden a la misma altura. */}
          <span aria-hidden className="mt-1 h-1 w-1" />
        </button>

        {/* Tab 4: Ayuda / Tutorial. Nombre = texto visible ("Ayuda"). */}
        <button
          type="button"
          onClick={openTutorial}
          className={`flex min-h-[44px] min-w-[64px] flex-col items-center justify-center transition-colors active:scale-95 ${inactivo}`}
        >
          <span aria-hidden className="material-symbols-outlined text-[22px]">help_outline</span>
          <span className="mt-0.5 text-xs">Ayuda</span>
          <span aria-hidden className="mt-1 h-1 w-1" />
        </button>
      </div>
    </nav>
  );
}
