"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@/components/ui/iconos";

/**
 * Armazón de los modales de reacomodo de /admin ("Mover esta foto", "Mover
 * este color"): fondo, hoja inferior en celular y tarjeta en pantalla grande,
 * foco atrapado mientras está abierto y devuelto al cerrar, y Esc para salir.
 *
 * Un solo armazón a propósito: dos modales con su propio listener de Tab/Esc
 * apilados uno sobre otro se pelean el teclado.
 */
export function ModalAdmin({
  titulo,
  descripcion,
  onCerrar,
  children,
}: {
  titulo: string;
  descripcion?: ReactNode;
  onCerrar: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  // Foco: al primer control al abrir, y de vuelta a donde estaba al cerrar.
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input, button:not([aria-label='Cerrar'])")?.focus();
    return () => previo?.focus();
  }, []);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        return onCerrar();
      }
      if (e.key !== "Tab" || !panel.current) return;
      const focusables = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (!primero) return;
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-admin-titulo"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-lg sm:rounded-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="modal-admin-titulo" className="text-xl font-semibold text-ink-display">
              {titulo}
            </h2>
            {descripcion && <div className="mt-1 text-base text-ink-soft">{descripcion}</div>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded border border-line text-ink-soft transition-colors hover:bg-line/30 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Caja de error de los modales (token `peligro`, anunciada al lector). */
export function ErrorModal({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mt-4 rounded border border-peligro/30 bg-peligro-suave px-3 py-2 text-base text-peligro">
      {children}
    </div>
  );
}
