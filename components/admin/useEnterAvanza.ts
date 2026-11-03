"use client";

import { useEffect, type RefObject } from "react";
import { enterAvanzaDesde, siguienteCampo, type CampoDescrito } from "@/lib/enter-avanza";

/**
 * Conecta "Enter pasa al siguiente campo" (`lib/enter-avanza.ts`) a un form.
 * En el último campo el foco va al botón de guardar (`data-atajo="guardar"`,
 * o el primer submit): nunca envía solo.
 *
 * El teclado del celular/tablet muestra "Siguiente" o "Listo" en la tecla
 * Enter según toque (`enterKeyHint`); se calcula al enfocar el campo porque
 * los formularios crecen solos (fotos, colores nuevos).
 */
export function useEnterAvanza(formRef: RefObject<HTMLFormElement | null>, activo = true) {
  useEffect(() => {
    const actual = formRef.current;
    if (!actual || !activo) return;
    // Una constante ya no-nula: las funciones de abajo se elevan (hoisting) y
    // TypeScript no les pasa el estrechamiento del `if`.
    const form: HTMLFormElement = actual;

    const controles = () => [...form.elements].filter(esControl);

    function alPresionar(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.isComposing || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!esControl(e.target) || !enterAvanzaDesde(describir(e.target))) return;

      e.preventDefault();
      const lista = controles();
      const siguiente = siguienteCampo(lista.map(describir), lista.indexOf(e.target));

      if (siguiente != null) {
        const destino = lista[siguiente];
        destino.focus();
        // Como en SICAR: al llegar a un campo con valor, escribir lo reemplaza.
        if (destino instanceof HTMLInputElement && esSeleccionable(destino)) destino.select();
        return;
      }
      botonGuardar(form)?.focus();
    }

    function alEnfocar(e: FocusEvent) {
      if (!(e.target instanceof HTMLInputElement) || !enterAvanzaDesde(describir(e.target))) return;
      const lista = controles();
      const esUltimo = siguienteCampo(lista.map(describir), lista.indexOf(e.target)) == null;
      e.target.enterKeyHint = esUltimo ? "done" : "next";
    }

    form.addEventListener("keydown", alPresionar);
    form.addEventListener("focusin", alEnfocar);
    return () => {
      form.removeEventListener("keydown", alPresionar);
      form.removeEventListener("focusin", alEnfocar);
    };
  }, [formRef, activo]);
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement;

function esControl(el: unknown): el is Control {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLButtonElement
  );
}

function describir(el: Control): CampoDescrito {
  const esInput = el instanceof HTMLInputElement;
  return {
    etiqueta: el.tagName.toLowerCase(),
    tipo: esInput ? el.type.toLowerCase() : "",
    nombre: el.name,
    marcado: esInput && el.checked,
    deshabilitado: el.disabled,
    soloLectura: (esInput || el instanceof HTMLTextAreaElement) && el.readOnly,
    // getClientRects vacío = display:none o dentro de algo oculto.
    visible: el.getClientRects().length > 0,
    enterPropio: el.closest("[data-enter-propio]") !== null,
  };
}

function esSeleccionable(input: HTMLInputElement): boolean {
  // `select()` (a diferencia de setSelectionRange) también vale en number y email.
  return ["text", "search", "tel", "url", "password", "number", "email", ""].includes(input.type);
}

function botonGuardar(form: HTMLFormElement): HTMLElement | null {
  return (
    form.querySelector<HTMLElement>('[data-atajo="guardar"]') ??
    form.querySelector<HTMLElement>('button[type="submit"], button:not([type]), input[type="submit"]')
  );
}
