"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AvisoGuardado } from "@/components/admin/AvisoGuardado";
import type { EstadoGuardado } from "@/lib/estado-guardado";

/**
 * Formulario de captura del admin que NO pierde lo escrito.
 * ---------------------------------------------------------------------------
 * Se envía a mano (`onSubmit` + `startTransition`), igual que /revision, y NO
 * con `<form action={...}>`: React 19 resetea el formulario al terminar la
 * acción aunque haya devuelto un error, y la tienda tendría que volver a
 * escribir todo. La acción devuelve `EstadoGuardado` y el aviso se pinta
 * junto al botón.
 *
 * Borrar con cuidado: un input marcado con `data-confirmar-vaciado="el precio"`
 * que TENÍA valor y se dejó vacío pide confirmación antes de guardar. Vaciar un
 * precio o un código es casi siempre un dedo que se resbaló, no una decisión.
 */
export function FormGuardable({
  accion,
  etiqueta,
  etiquetaPendiente = "Guardando…",
  size = "lg",
  reiniciarAlGuardar = false,
  className,
  children,
}: {
  accion: (datos: FormData) => Promise<EstadoGuardado>;
  etiqueta: string;
  etiquetaPendiente?: string;
  size?: "sm" | "lg";
  /** Para formularios de alta: tras guardar bien, el form vuelve a quedar vacío. */
  reiniciarAlGuardar?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [estado, setEstado] = useState<EstadoGuardado | null>(null);
  const [pendiente, startTransition] = useTransition();

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    const vaciados = camposVaciados(form);
    if (
      vaciados.length > 0 &&
      !window.confirm(`¿Seguro que quieres quitar ${vaciados.join(" y ")}? Se guardará vacío.`)
    ) {
      return;
    }

    const datos = new FormData(form);
    startTransition(async () => {
      try {
        const resultado = await accion(datos);
        setEstado(resultado);
        if (resultado.ok && reiniciarAlGuardar) form.reset();
      } catch (error) {
        // `redirect()` del servidor (sesión vencida) viaja como excepción:
        // hay que dejarla pasar para que Next navegue al login.
        if (esRedireccion(error)) throw error;
        setEstado({
          ok: false,
          error: "No se pudo guardar. Revisa tu conexión a internet e inténtalo otra vez.",
        });
      }
    });
  }

  return (
    <form onSubmit={enviar} className={className}>
      {children}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <SubmitButton label={etiqueta} pendingLabel={etiquetaPendiente} size={size} pending={pendiente} />
        <AvisoGuardado estado={estado} />
      </div>
    </form>
  );
}

/** Etiquetas de los inputs que tenían valor al cargar y ahora están vacíos. */
function camposVaciados(form: HTMLFormElement): string[] {
  const marcados = form.querySelectorAll<HTMLInputElement>("input[data-confirmar-vaciado]");
  return [...marcados]
    .filter((input) => input.defaultValue.trim() !== "" && input.value.trim() === "")
    .map((input) => input.dataset.confirmarVaciado ?? input.name);
}

function esRedireccion(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
