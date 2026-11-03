"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TelaImage } from "@/components/TelaImage";
import { cambiarMascaraFoto } from "@/app/admin/actions";
import type { FichaFondo } from "@/lib/admin/fondos";
import { publicImageUrl } from "@/lib/supabase/storage";

const SIZES = "(min-width: 1024px) 180px, (min-width: 640px) 25vw, 45vw";

const ESTADOS: Record<FichaFondo["estado"], string> = {
  activa: "Encendida",
  "sin-revisar": "Nueva, apagada",
  excluida: "Apagada",
  vencida: "Foto cambiada",
};

/**
 * Antes y después de una foto, con su interruptor. El velo se pinta siempre, sin
 * importar el interruptor general: esta pantalla existe para decidir antes de
 * prenderlo. Una foto reprocesada no ofrece el cambio porque su máscara ya no
 * coincide y el catálogo la muestra original pase lo que pase.
 */
export function TarjetaFondo({ ficha }: { ficha: FichaFondo }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const encendida = ficha.estado === "activa";
  const vencida = ficha.estado === "vencida";
  const src = publicImageUrl(ficha.ruta);

  const cambiar = () => {
    setError(null);
    startTransition(async () => {
      const res = await cambiarMascaraFoto(ficha.fotoId, !encendida);
      if (res.error) return setError(res.error);
      router.refresh();
    });
  };

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-surface-container-lowest p-3 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <figure className="min-w-0">
          <div className="overflow-hidden rounded">
            <TelaImage src={src} derivados={ficha.derivados} alt={`${ficha.nombre}, foto original`} sizes={SIZES} />
          </div>
          <figcaption className="mt-1 text-sm text-ink-soft">Original</figcaption>
        </figure>
        <figure className="min-w-0">
          <div className="overflow-hidden rounded border border-line">
            {vencida ? (
              <div className="flex aspect-square items-center justify-center p-2 text-center text-sm text-ink-soft">
                Sin vista previa
              </div>
            ) : (
              <TelaImage
                src={src}
                derivados={ficha.derivados}
                mascara={ficha.mascara}
                alt={`${ficha.nombre}, con fondo blanco`}
                sizes={SIZES}
              />
            )}
          </div>
          <figcaption className="mt-1 text-sm text-ink-soft">Fondo blanco</figcaption>
        </figure>
      </div>

      <div className="min-w-0">
        {ficha.telaId ? (
          <Link
            href={`/admin/tela/${ficha.telaId}`}
            className="block truncate text-base font-semibold text-ink-display underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
          >
            {ficha.nombre}
          </Link>
        ) : (
          <p className="truncate text-base font-semibold text-ink-display">{ficha.nombre}</p>
        )}
        <p className="text-sm font-semibold text-amber">{ESTADOS[ficha.estado]}</p>
      </div>

      {vencida ? (
        <p className="text-sm text-ink-soft">
          Esta foto cambió después de preparar su fondo. El catálogo muestra la original.
        </p>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={encendida}
          aria-label={`Fondo blanco para ${ficha.nombre}`}
          onClick={cambiar}
          disabled={pendiente}
          className={`inline-flex min-h-11 items-center justify-center rounded border px-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:cursor-not-allowed disabled:opacity-60 ${
            encendida
              ? "border-line bg-surface-container-lowest text-ink-display hover:bg-surface-container"
              : "border-heritage-navy bg-heritage-navy text-white hover:bg-deep-slate"
          }`}
        >
          {pendiente ? "Guardando…" : encendida ? "Apagar en esta foto" : "Prender en esta foto"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </article>
  );
}
