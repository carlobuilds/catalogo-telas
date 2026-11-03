"use client";

import { useFormStatus } from "react-dom";
import { teclaDe } from "@/lib/atajos";

/**
 * Botón de submit con estado "guardando…". Por default lo lee de
 * useFormStatus (vive DENTRO del <form> cuya action quiere observar), pero
 * acepta `pending` explícito para forms que se envían a mano con
 * `onSubmit` + `startTransition` en vez de `<form action={...}>` —
 * useFormStatus solo reacciona a ese segundo mecanismo.
 *
 * `atajo` lo marca para el teclado (`data-atajo`, ver `AtajosAdmin`) y pinta
 * la tecla junto a la etiqueta cuando hay mouse/trackpad.
 */
export function SubmitButton({
  label,
  pendingLabel,
  size = "lg",
  pending: pendienteExterno,
  atajo,
}: {
  label: string;
  pendingLabel: string;
  size?: "sm" | "lg";
  pending?: boolean;
  atajo?: "guardar" | "guardar-otro";
}) {
  const { pending: pendienteFormStatus } = useFormStatus();
  const pending = pendienteExterno ?? pendienteFormStatus;

  const sizeClasses = size === "lg" ? "min-h-12 px-5 w-full" : "min-h-11 px-4";

  return (
    <button
      type="submit"
      disabled={pending}
      data-atajo={atajo}
      className={`inline-flex items-center justify-center gap-2 rounded bg-amber text-base font-semibold text-white shadow-sm transition-colors hover:bg-amber/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses}`}
    >
      {pending ? pendingLabel : label}
      {atajo && !pending && (
        <kbd className="hidden rounded border border-white/50 px-1.5 font-sans text-sm font-semibold pointer-fine:inline">
          {teclaDe(atajo)}
        </kbd>
      )}
    </button>
  );
}
