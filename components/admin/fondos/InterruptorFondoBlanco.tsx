"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarFondoBlanco } from "@/app/admin/actions";

const BOTON =
  "inline-flex min-h-11 items-center justify-center rounded px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Interruptor general. Prender pide confirmación porque lo ve toda la clientela al
 * instante; apagar no, porque solo devuelve las fotos originales.
 */
export function InterruptorFondoBlanco({
  activo,
  encendidas,
}: {
  activo: boolean;
  encendidas: number;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const cambiar = (valor: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await cambiarFondoBlanco(valor);
      if (res.error) return setError(res.error);
      setConfirmando(false);
      router.refresh();
    });
  };

  return (
    <section
      aria-labelledby="interruptor-titulo"
      className="mb-6 rounded-lg border border-line bg-surface-container-lowest p-4 shadow-sm"
    >
      <h2 id="interruptor-titulo" className="text-lg font-semibold text-ink-display">
        Fondo blanco en el catálogo: {activo ? "prendido" : "apagado"}
      </h2>
      <p className="mt-1 text-base text-ink-soft">
        {activo
          ? `El catálogo muestra con fondo blanco las ${encendidas} fotos encendidas. Las demás se ven como siempre.`
          : "El catálogo muestra las fotos originales. Revisa abajo cómo quedarían antes de prenderlo."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {activo ? (
          <button
            type="button"
            onClick={() => cambiar(false)}
            disabled={pendiente}
            className={`${BOTON} border border-line bg-surface-container-lowest text-ink-display hover:bg-surface-container`}
          >
            {pendiente ? "Apagando…" : "Apagar fondo blanco"}
          </button>
        ) : confirmando ? (
          <>
            <button
              type="button"
              onClick={() => cambiar(true)}
              disabled={pendiente}
              className={`${BOTON} bg-heritage-navy text-white hover:bg-deep-slate`}
            >
              {pendiente ? "Prendiendo…" : "Sí, que lo vean todas las clientas"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={pendiente}
              className={`${BOTON} border border-line bg-surface-container-lowest text-ink-display hover:bg-surface-container`}
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className={`${BOTON} bg-heritage-navy text-white hover:bg-deep-slate`}
          >
            Prender fondo blanco
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-base font-semibold text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
