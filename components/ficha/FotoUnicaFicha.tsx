"use client";

import { useState } from "react";
import { TelaImage } from "@/components/TelaImage";
import { ControlesFoto } from "@/components/ficha/ControlesFoto";
import { VisorZoom } from "@/components/ficha/VisorZoom";
import { dimensionesDeZoom } from "@/lib/fotos";
import type { MascaraFoto } from "@/lib/fondo-blanco";
import { urlDerivado } from "@/lib/supabase/storage";
import type { DerivadosFoto } from "@/lib/types";

/** La ficha de un producto con una sola foto: la mitad del catálogo, sin carrusel. */
export function FotoUnicaFicha({
  src,
  derivados,
  mascara,
  alt,
}: {
  src: string | null;
  derivados: DerivadosFoto | null | undefined;
  mascara: MascaraFoto | null;
  alt: string;
}) {
  const [fondoBlanco, setFondoBlanco] = useState(false);
  const [viendoDeCerca, setViendoDeCerca] = useState(false);
  const dimensiones = dimensionesDeZoom(derivados);
  const srcBase = urlDerivado(derivados, "md");
  const srcDetalle = urlDerivado(derivados, "lg");

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded border border-outline-variant/30 bg-surface-container-lowest p-2 shadow-sm">
        <div
          onClick={dimensiones ? () => setViendoDeCerca(true) : undefined}
          className={`relative aspect-square overflow-hidden rounded bg-surface-container-low ${
            dimensiones ? "cursor-zoom-in" : ""
          }`}
        >
          <TelaImage
            src={src}
            derivados={derivados}
            mascara={fondoBlanco ? mascara : null}
            sizes="(max-width: 1023px) 100vw, 50vw"
            alt={alt}
            aspecto="cuadrado"
            priority
          />
        </div>
      </div>
      <ControlesFoto
        onAcercar={dimensiones ? () => setViendoDeCerca(true) : undefined}
        conMascara={mascara !== null}
        fondoBlanco={fondoBlanco}
        onCambiarFondo={() => setFondoBlanco((v) => !v)}
      />
      {viendoDeCerca && dimensiones && srcBase && srcDetalle && (
        <VisorZoom
          srcBase={srcBase}
          srcDetalle={srcDetalle}
          alt={alt}
          ancho={dimensiones.ancho}
          alto={dimensiones.alto}
          onCerrar={() => setViendoDeCerca(false)}
        />
      )}
    </div>
  );
}
