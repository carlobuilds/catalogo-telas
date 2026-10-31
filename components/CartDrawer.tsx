"use client";

import { useEffect, useRef, useState } from "react";
import { X, Trash2, MessageCircle, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { publicImageUrl } from "@/lib/supabase/storage";
import { buildQuoteMessage, pesos } from "@/lib/whatsapp-message";
import { unidadDe, cantidadCorta } from "@/lib/unidades";
import { TelaImage } from "./TelaImage";
import { Button } from "@/components/ui/Button";
import { ShareCatalog } from "@/components/ShareCatalog";

/** Lo que se puede enfocar dentro del panel, para encerrar el Tab. */
const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Panel abierto = diálogo modal: Esc cierra, Tab no se sale del panel, el
  // foco entra al abrir y vuelve a donde estaba (el botón de la cesta) al
  // cerrar. Cerrado, `inert` lo saca del orden de tabulación y del lector:
  // antes seguía ahí, fuera de pantalla, y el Tab se perdía en sus botones.
  useEffect(() => {
    if (!mounted || !isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focoPrevio = document.activeElement as HTMLElement | null;
    // preventScroll: el panel aún viene deslizándose desde la derecha.
    panel.focus({ preventScroll: true });

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const enfocables = Array.from(panel.querySelectorAll<HTMLElement>(ENFOCABLES));
      if (enfocables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement;
      const fuera = !panel.contains(activo);

      if (e.shiftKey && (activo === primero || activo === panel || fuera)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (activo === ultimo || fuera)) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowPrevio;
      // Solo si el foco sigue dentro (o se quedó en el body): si la persona ya
      // se fue a otra parte —p. ej. el enlace de WhatsApp abrió otra pestaña—
      // no se le jala de regreso.
      const activo = document.activeElement;
      if (!activo || activo === document.body || panel.contains(activo)) {
        focoPrevio?.focus();
      }
    };
  }, [mounted, isOpen, setIsOpen]);

  if (!mounted) return null;

  const total = items.reduce(
    (acc, item) => acc + (item.precio ?? 0) * item.cantidad,
    0
  );

  const haySinPrecio = items.some((item) => item.precio == null);
  const hayReferencia = items.some((item) => item.precio_referencia);

  const numero = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "";
  const waHref = `https://wa.me/${numero}?text=${encodeURIComponent(buildQuoteMessage(items))}`;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink-deep/50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Drawer. `tabIndex={-1}`: recibe el foco al abrir para que el lector
          anuncie "Tu Cesta, diálogo" antes de cualquier botón; no entra al
          orden de tabulación. Sin contorno propio porque es el panel entero,
          no un control. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cesta-titulo"
        tabIndex={-1}
        inert={!isOpen}
        style={{ outline: "none" }}
        className={`fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col bg-sand-bg border-l border-line/60 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line/60 p-4 sm:p-6 bg-surface-container-low/50">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span aria-hidden className="material-symbols-outlined text-[20px] text-amber">shopping_bag</span>
              <span className="text-label-caps text-xs text-amber">
                Cotización de Telas
              </span>
            </div>
            <h2 id="cesta-titulo" className="font-display text-2xl font-bold text-ink-display mt-1">Tu Cesta</h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              Revisa tus metros seleccionados y envíalos por WhatsApp sin compromiso.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-container hover:text-ink-display focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
            aria-label="Cerrar cotización"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div
          className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 ${
            items.length === 0 ? "pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]" : ""
          }`}
        >
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div aria-hidden className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-amber">
                <span className="material-symbols-outlined text-[32px]">shopping_basket</span>
              </div>
              <p className="font-display text-xl font-bold text-ink-display">Tu cesta está vacía</p>
              <p className="mt-2 max-w-xs text-sm text-ink-soft">
                Explora el catálogo, elige tus metros favoritos y agrégalos aquí.
              </p>
              <Button
                variant="primary"
                size="md"
                className="mt-6"
                onClick={() => setIsOpen(false)}
              >
                Explorar catálogo
              </Button>
              <div className="mt-3">
                <ShareCatalog variant="ghost" size="md" label="Compartir catálogo" />
              </div>
            </div>
          ) : (
            <ul className="space-y-3.5">
              {items.map((item) => {
                const unidad = unidadDe(item.unidad_venta);
                const nombre = item.color_nombre
                  ? `${item.tela_nombre} ${item.color_nombre}`
                  : item.tela_nombre;
                const boton =
                  "flex h-11 w-11 items-center justify-center rounded bg-surface-container-lowest text-lg font-bold leading-none text-ink-display shadow-2xs transition-all hover:bg-surface-container-high active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy";
                return (
                <li key={item.id} className="flex gap-3.5 rounded border border-outline-variant/30 bg-surface-container-lowest p-3.5 shadow-2xs">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded border border-outline-variant/20 bg-surface-container-low">
                    <TelaImage
                      src={publicImageUrl(item.foto_principal)}
                      derivados={item.foto_derivados}
                      sizes="80px"
                      alt={item.tela_nombre}
                      aspecto="cuadrado"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-display font-bold leading-tight text-ink-display break-words">{item.tela_nombre}</h3>
                      <p className="mt-0.5 text-sm text-ink-soft break-words">
                        {item.color_nombre} {item.sku && `· Código: ${item.sku}`}
                      </p>
                    </div>
                    {/* `flex-wrap`: a 375px el stepper (138px) + precio + basura
                        no caben junto a la foto; el precio y la basura bajan a
                        su propio renglón en vez de salirse de la tarjeta. */}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                      <div className="flex items-center rounded border border-outline-variant/30 bg-surface-container p-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              Math.max(unidad.minimo, item.cantidad - unidad.paso)
                            )
                          }
                          className={boton}
                          aria-label={`Disminuir ${unidad.singular} de ${nombre}`}
                        >
                          <span aria-hidden>−</span>
                        </button>
                        <span
                          aria-live="polite"
                          className="min-w-[3rem] px-1 text-center text-sm font-bold text-ink-display"
                        >
                          {cantidadCorta(item.cantidad, item.unidad_venta)}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.cantidad + unidad.paso)}
                          className={boton}
                          aria-label={`Aumentar ${unidad.singular} de ${nombre}`}
                        >
                          <span aria-hidden>+</span>
                        </button>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <span className="text-sm font-bold text-amber">
                          {item.precio != null ? pesos.format(item.precio * item.cantidad) : "Consultar"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
                          aria-label={`Eliminar ${nombre}`}
                        >
                          <Trash2 className="h-5 w-5" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line/60 bg-surface-container-lowest p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-lg sm:p-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wider text-ink-soft">
                {haySinPrecio ? "Total parcial" : "Total estimado"}
              </span>
              <span className="font-display text-2xl sm:text-3xl font-bold text-amber">
                {pesos.format(total)}
              </span>
            </div>
            <p className="mb-4 text-sm text-ink-soft leading-relaxed">
              {hayReferencia
                ? "Incluye precios de referencia. Confirmamos precio final y disponibilidad por WhatsApp."
                : haySinPrecio
                  ? "Algunos artículos se cotizan por WhatsApp; no están en el total."
                  : "Es una estimación. Confirmamos disponibilidad y apartado por WhatsApp."}
            </p>
            <Button
              variant="whatsapp"
              size="lg"
              fullWidth
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="h-14"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              Enviar pedido por WhatsApp
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              className="mt-2.5"
              onClick={() => setIsOpen(false)}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Seguir explorando
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

