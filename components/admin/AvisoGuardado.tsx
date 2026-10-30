"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { EstadoGuardado } from "@/lib/estado-guardado";

/**
 * Confirmación de guardado del admin. Mismo comportamiento que
 * `components/revision/GuardadoFeedback` (el "Guardado" se oculta solo, el
 * error se queda), pero en tamaño de lectura cómoda: quien captura aquí no
 * debería tener que acercarse a la pantalla para saber si su cambio quedó.
 */
export function AvisoGuardado({ estado }: { estado: EstadoGuardado | null }) {
  const [mostrarExito, setMostrarExito] = useState(false);

  useEffect(() => {
    if (!estado?.ok) return;
    setMostrarExito(true);
    const t = setTimeout(() => setMostrarExito(false), 3000);
    return () => clearTimeout(t);
  }, [estado]);

  return (
    <p className="min-h-6 text-base" aria-live="polite">
      {mostrarExito && (
        <span className="inline-flex items-center gap-1.5 font-semibold text-success">
          <Check className="h-5 w-5" aria-hidden />
          Guardado
        </span>
      )}
      {estado && !estado.ok && (
        <span role="alert" className="font-medium text-amber">
          {estado.error}
        </span>
      )}
    </p>
  );
}
