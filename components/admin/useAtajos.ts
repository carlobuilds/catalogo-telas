"use client";

import { useEffect, useRef } from "react";
import { accionDeTecla, type AccionAtajo } from "@/lib/atajos";

/**
 * Un manejador devuelve `false` si NO hizo nada (p. ej. Esc sin botón de
 * cancelar en pantalla): entonces la tecla conserva su comportamiento normal.
 */
export type ManejadoresAtajos = Partial<Record<AccionAtajo, () => boolean | void>>;

/**
 * Escucha los atajos del admin en `window`. Uno solo para todo el panel (lo
 * monta `ShellAdmin`): dos listeners atendiendo F10 guardarían dos veces.
 *
 * Se ignora la tecla cuando:
 * - `isComposing`: se está armando un carácter con acento (´ + a = á).
 * - `repeat`: tecla sostenida; F10 dejado apretado no debe guardar diez veces.
 * - `defaultPrevented`: algún componente ya la atendió.
 * - hay un modal abierto (curador de fotos, mover foto, ayuda): ese modal
 *   manda sobre su propio Esc y no debe quedar una navegación debajo.
 */
export function useAtajos(manejadores: ManejadoresAtajos) {
  // En un ref para no re-suscribir el listener en cada render.
  const ref = useRef(manejadores);
  useEffect(() => {
    ref.current = manejadores;
  });

  useEffect(() => {
    function alPresionar(e: KeyboardEvent) {
      if (e.isComposing || e.repeat || e.defaultPrevented) return;
      if (hayModalAbierto()) return;

      const accion = accionDeTecla(e, estaEscribiendo(e.target));
      if (!accion) return;

      const manejador = ref.current[accion];
      if (!manejador) return;
      if (manejador() !== false) e.preventDefault();
    }

    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);
}

function hayModalAbierto(): boolean {
  return document.querySelector('dialog[open], [aria-modal="true"]') !== null;
}

function estaEscribiendo(destino: EventTarget | null): boolean {
  if (!(destino instanceof HTMLElement)) return false;
  if (destino.isContentEditable) return true;
  if (destino instanceof HTMLTextAreaElement || destino instanceof HTMLSelectElement) return true;
  if (destino instanceof HTMLInputElement) {
    return !["checkbox", "radio", "button", "submit", "reset", "file", "image"].includes(destino.type);
  }
  return false;
}
