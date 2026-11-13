"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit destructivo con confirmación nativa. Debe vivir DENTRO del <form>
 * cuya action dispara (usa useFormStatus, igual que SubmitButton).
 *
 * Mide al menos 44px en los dos tamaños (se toca en la tablet) y usa el token
 * `peligro`, no los `red-*` de Tailwind. `xs` solo es más angosto, no más bajo.
 */
export function ConfirmSubmit({
  label,
  pendingLabel,
  mensaje,
  size = "md",
}: {
  label: string;
  pendingLabel: string;
  mensaje: string;
  size?: "md" | "xs";
}) {
  const { pending } = useFormStatus();

  const sizeClasses = size === "md" ? "px-4 text-base" : "px-3 text-sm";

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded border border-peligro/30 bg-surface font-semibold text-peligro shadow-sm transition-colors hover:bg-peligro-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peligro disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
