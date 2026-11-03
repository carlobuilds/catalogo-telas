import type { ReactNode } from "react";

/**
 * Título de cada pantalla del admin. El menú, la sesión y "Salir" ya viven
 * en `ShellAdmin`; aquí solo va el nombre de la pantalla, una línea que dice
 * para qué sirve y, opcionalmente, sus acciones.
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-ink-display sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 text-base text-ink-soft">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}
