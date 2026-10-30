"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useCartStore } from "@/lib/store";
import { useGuideStore } from "@/lib/guide-store";
import { Question, ShoppingBag, Sparkle, SquaresFour, type Icon } from "@/components/ui/iconos";

/**
 * Barra inferior del celular. Mide 4rem (h-16): `AddToCart` y la ficha de
 * tela calculan su propio `bottom` con ese número, no cambiarlo a la ligera.
 *
 * La pestaña activa se marca con el icono RELLENO sobre un bloque púrpura —
 * el púrpura es color de acción y nunca va en texto, así que la etiqueta se
 * queda en tinta—. Antes era un punto de 4px bajo un texto de 11px al 70% de
 * opacidad (contraste 2.97:1): para quien tiene 40+ no se distinguía qué
 * pestaña estaba abierta.
 */
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

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="fixed bottom-0 left-0 right-0 z-40 block border-t border-line/60 bg-sand-bg/95 pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:hidden"
    >
      <div className="flex h-16 items-stretch justify-around px-1">
        <Pestana href="/" icono={SquaresFour} etiqueta="Catálogo" activa={isCatalogo} />
        <Pestana href="/inspiracion" icono={Sparkle} etiqueta="Inspiración" activa={isInspiracion} />
        <Pestana
          icono={ShoppingBag}
          etiqueta="Cesta"
          onClick={() => setIsOpen(true)}
          detalle={mounted && itemCount > 0 ? `, ${itemCount} ${itemCount === 1 ? "artículo" : "artículos"}` : undefined}
          insignia={
            mounted &&
            itemCount > 0 && (
              <span aria-hidden className="absolute -right-2.5 -top-1.5 flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-amber px-1 text-sm font-bold leading-none text-white shadow-xs">
                {itemCount}
              </span>
            )
          }
        />
        <Pestana icono={Question} etiqueta="Ayuda" onClick={openTutorial} />
      </div>
    </nav>
  );
}

function Pestana({
  icono: Icono,
  etiqueta,
  activa = false,
  href,
  onClick,
  insignia,
  detalle,
}: {
  icono: Icon<"bold" | "fill">;
  etiqueta: string;
  activa?: boolean;
  href?: string;
  onClick?: () => void;
  insignia?: ReactNode;
  /** Solo lector de pantalla, DESPUÉS de la etiqueta: quien navega por voz dice lo que ve. */
  detalle?: string;
}) {
  const clase = `flex min-w-16 flex-1 flex-col items-center justify-center gap-1 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-heritage-navy ${
    activa ? "font-bold text-ink-display" : "font-medium text-ink-soft hover:text-ink-display"
  }`;

  const contenido = (
    <>
      <span
        className={`relative flex h-7 w-12 items-center justify-center rounded-lg transition-colors ${
          activa ? "bg-heritage-navy text-white" : ""
        }`}
      >
        <Icono className="size-6" weight={activa ? "fill" : "bold"} />
        {insignia}
      </span>
      <span className="text-sm leading-none">{etiqueta}</span>
      {detalle && <span className="sr-only">{detalle}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={clase} aria-current={activa ? "page" : undefined}>
        {contenido}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={clase}>
      {contenido}
    </button>
  );
}
