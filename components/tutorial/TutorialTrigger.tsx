"use client";

import { useGuideStore } from "@/lib/guide-store";

interface TutorialTriggerProps {
  variant?: "hero-banner" | "button" | "pill" | "floating" | "compact";
  className?: string;
}

/**
 * Puerta de entrada al tutorial del catálogo con estilos refinados "Artisanal Modernity".
 */
export function TutorialTrigger({
  variant = "hero-banner",
  className = "",
}: TutorialTriggerProps) {
  const openTutorial = useGuideStore((s) => s.openTutorial);

  if (variant === "hero-banner") {
    // Un <button> de verdad (antes era un <div role="button"> con su propio
    // manejo de Enter/Espacio). Por eso por dentro solo hay <span>: un botón
    // no admite <div>, <h3> ni <p>, y un encabezado dentro de un botón
    // pierde su semántica de todos modos.
    return (
      <button
        type="button"
        onClick={openTutorial}
        className={`group relative w-full cursor-pointer overflow-hidden rounded border border-amber/35 bg-surface-container-lowest/90 p-3.5 text-left sm:p-4 shadow-xs backdrop-blur-md transition-all hover:border-amber hover:bg-surface-container-lowest hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy ${className}`}
      >
        {/* Detalle decorativo de fondo */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber/10 blur-xl transition-opacity group-hover:opacity-100 opacity-60"
        />

        <span className="relative flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-amber text-white shadow-2xs group-hover:scale-105 transition-transform"
            >
              <span className="material-symbols-outlined text-[20px]">help_outline</span>
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="text-label-caps text-xs text-amber">
                  Guía interactiva
                </span>
                <span className="inline-flex items-center rounded bg-amber/15 px-1.5 py-0.5 text-xs font-bold text-amber">
                  4 pasos
                </span>
              </span>
              <span className="font-display text-base font-bold leading-snug text-ink-display">
                ¿Primera vez comprando?
              </span>
              <span className="hidden text-sm text-ink-soft sm:block">
                Aprende cómo cotizar por WhatsApp en 1 min.
              </span>
            </span>
          </span>

          {/* Adorno dentro del botón, no un objetivo aparte: el toque lo
              recibe la tarjeta entera. */}
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-surface-container px-3 py-2 text-sm font-bold text-ink-display group-hover:bg-heritage-navy group-hover:text-white transition-colors shadow-2xs">
            <span className="hidden sm:inline">Ver guía</span>
            <span
              aria-hidden
              className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5"
            >
              arrow_forward
            </span>
          </span>
        </span>
      </button>
    );
  }

  if (variant === "floating") {
    return (
      // Sin aria-label: el nombre es lo que se lee en el botón,
      // "¿Dudas? Cómo pedir (4 pasos)".
      <button
        type="button"
        onClick={openTutorial}
        className={`group fixed sm:bottom-6 sm:right-6 z-30 hidden sm:flex min-h-[44px] items-center gap-2.5 rounded border border-amber/50 bg-surface-container-lowest/95 px-4 py-2.5 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:border-amber hover:bg-surface-container-lowest hover:shadow-xl active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy ${className}`}
      >
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded bg-amber text-white shadow-xs group-hover:rotate-12 transition-transform"
        >
          <span className="material-symbols-outlined text-[18px]">help_outline</span>
        </span>
        <span className="flex flex-col text-left">
          <span className="text-label-caps text-xs text-amber">
            ¿Dudas?
          </span>
          <span className="text-sm font-bold text-ink-display">
            Cómo pedir (4 pasos)
          </span>
        </span>
      </button>
    );
  }

  if (variant === "compact" || variant === "pill") {
    return (
      <button
        type="button"
        onClick={openTutorial}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded border border-amber/35 bg-surface-container-lowest px-3.5 text-sm font-semibold text-ink-display shadow-xs transition-all hover:border-amber hover:bg-surface-container hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy ${className}`}
      >
        <span aria-hidden className="material-symbols-outlined text-[18px] text-amber">help_outline</span>
        <span>¿Cómo pedir en 4 pasos?</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openTutorial}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded border border-outline-variant/50 bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-ink-display shadow-xs transition-all hover:bg-surface-container hover:border-heritage-navy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy ${className}`}
    >
      <span aria-hidden className="material-symbols-outlined text-[18px] text-amber">help_outline</span>
      <span>¿Primera vez? Mira cómo pedir en 4 pasos</span>
    </button>
  );
}
