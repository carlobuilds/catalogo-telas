"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { ImageBroken } from "@/components/ui/iconos";
import type { DerivadosFoto } from "@/lib/types";
import type { MascaraFoto } from "@/lib/fondo-blanco";
import { srcsetDerivados, urlDerivado, urlMascara } from "@/lib/supabase/storage";

/** Si la máscara no llega en este tiempo, la foto se muestra sin esperarla. */
const ESPERA_MASCARA_MS = 1500;

/**
 * Ancho al que se pinta la foto en el grid del catálogo, medido contra la
 * retícula real (`app/page.tsx`, contenedor `max-w-7xl` con `p-2 sm:p-3` en la
 * card y `p-px` en el marco), no estimado:
 *
 *   ≤1023px  → 2 columnas   (el grid no pasa a 3 hasta `lg:`)  ~40–44vw
 *   1024–1279 → 3 columnas                                      ~28–29vw
 *   1280–1343 → 4 columnas                                      ~21vw
 *   ≥1344px  → 4 columnas con el contenedor TOPADO: ancho FIJO ~282px
 *
 * El valor anterior declaraba `33vw` en la banda de 2 columnas, así que a
 * 1023px y DPR 2 pedía 676px y recibía el derivado `sm` (800) para un hueco de
 * 911 → se veía blando. Y arriba de 1344 pedía `25vw` del viewport completo,
 * bajando el `md` (1600) cuando basta el `sm`.
 */
const SIZES_GRID =
  "(min-width: 1344px) 288px, " +
  "(min-width: 1280px) 22vw, " +
  "(min-width: 1024px) 30vw, " +
  "45vw";

/**
 * Proporción de la ventana. Tiene que ser un mapa de clases COMPLETAS: Tailwind
 * v4 escanea el código fuente buscando literales, así que una clase armada en
 * runtime (`aspect-[${x}]`) compila, pasa los tipos y no existe en el CSS.
 *
 * El default es `cuadrado` porque TODO lo que pinta fotos ya es cuadrado: el
 * grid, la ficha, el carrito y el listado de /admin. Los maestros también lo
 * son —`lib/images/recorte.ts` entrega siempre un cuadrado y el curador de
 * /admin recorta a 1:1—, así que la ventana enseña la foto ÍNTEGRA y lo que
 * se encuadró es literalmente lo que se ve.
 *
 * El default era `retrato`, de cuando la card era 3:4, y sobrevivió al cambio:
 * `object-cover` en 3:4 descarta 12.5% del ancho por lado, y la miniatura del
 * listado de /admin —el único punto que no pasaba `aspecto`— recortaba en
 * silencio lo que el admin acababa de encuadrar a mano. `retrato` sigue
 * disponible para una ventana que de verdad lo sea, pero ya nadie lo pide.
 */
const ASPECTOS = {
  retrato: "aspect-[3/4]",
  cuadrado: "aspect-square",
  libre: "h-full",
} as const;

export type AspectoTelaImage = keyof typeof ASPECTOS;

/**
 * Imagen de tela con skeleton mientras carga (lazy por defecto).
 *
 * Con `derivados` (foto ya procesada por el pipeline) usa <img srcset> directo
 * a los WebP del CDN de Supabase: los bytes calibrados (sharpening, sRGB)
 * llegan al navegador SIN recompresión del optimizador de Next, y no consumen
 * cuota de transformaciones de Vercel. Sin `derivados` cae a next/image sobre
 * el original (fotos aún no procesadas → corre `pnpm backfill:derivados`).
 *
 * Con `mascara` pinta encima el velo de fondo blanco; la foto no cambia. Un
 * `mask-image` no tiene `loading="lazy"` ni avisa cuándo cargó, así que un <img>
 * invisible hace ambas cosas, con `crossOrigin` para compartir caché con la
 * máscara. Si la máscara ya venía al montar, la foto la espera y así no destella
 * negra; si llega después, como con el botón de la ficha, la foto ya se está viendo
 * y no se esconde.
 */
export function TelaImage({
  src,
  alt,
  derivados,
  mascara,
  sizes = SIZES_GRID,
  priority = false,
  aspecto = "cuadrado",
}: {
  src: string | null;
  alt: string;
  derivados?: DerivadosFoto | null;
  /** Máscara de fondo blanco a pintar encima. Sin ella, la foto tal cual. */
  mascara?: MascaraFoto | null;
  /** Cómo se renderiza según viewport (para elegir el derivado correcto). */
  sizes?: string;
  priority?: boolean;
  /** Proporción de la ventana; el default 1:1 es el de todo el catálogo. */
  aspecto?: AspectoTelaImage;
}) {
  const [loaded, setLoaded] = useState(false);
  const proporcion = ASPECTOS[aspecto];

  const urlVelo = mascara ? urlMascara(mascara.ruta, mascara.generado_en) : null;
  const [esperaVelo] = useState(Boolean(mascara));
  const [veloCargado, setVeloCargado] = useState<string | null>(null);
  const [sinEspera, setSinEspera] = useState(false);
  const veloListo = urlVelo !== null && veloCargado === urlVelo;
  const visible = loaded && (!esperaVelo || !urlVelo || veloListo || sinEspera);

  useEffect(() => {
    if (!esperaVelo || !urlVelo || !loaded || veloListo) return;
    const espera = window.setTimeout(() => setSinEspera(true), ESPERA_MASCARA_MS);
    return () => window.clearTimeout(espera);
  }, [esperaVelo, urlVelo, loaded, veloListo]);

  if (!src) {
    return (
      <div className={`flex ${proporcion} w-full items-center justify-center rounded-t bg-line/50 text-ink-soft`}>
        <ImageBroken className="h-8 w-8" aria-hidden />
      </div>
    );
  }

  const srcSet = srcsetDerivados(derivados);
  const clase = `object-cover transition-opacity duration-500 ${
    visible ? "opacity-100" : "opacity-0"
  }`;

  return (
    // Con velo no se redondea aquí: la foto y el velo se recortan por separado y, en
    // el píxel a medio cubrir de la esquina, plus-lighter satura el alfa antes que
    // el color y queda un arco gris. Lo redondea el marco de afuera, sobre el resultado.
    <div
      className={`relative isolate ${proporcion} w-full overflow-hidden ${
        urlVelo ? "" : "rounded-t"
      } bg-line/40`}
    >
      {!visible && <div className="absolute inset-0 animate-pulse bg-line/60" />}
      {srcSet ? (
        // eslint-disable-next-line @next/next/no-img-element -- srcset directo a los derivados WebP: evita la recompresión de next/image a propósito
        <img
          src={urlDerivado(derivados, "md") ?? src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          ref={(el) => {
            // Imagen ya en caché al hidratar: onLoad no dispara → apagar skeleton.
            if (el?.complete && !loaded) setLoaded(true);
          }}
          className={`absolute inset-0 h-full w-full ${clase}`}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={clase}
          onLoad={() => setLoaded(true)}
          ref={(el) => {
            // Mismo catch-up que la rama <img> de arriba: si next/image ya
            // resolvió la imagen desde caché al hidratar, onLoad no dispara
            // y el skeleton se queda pegado en opacity-0 para siempre.
            if (el?.complete && !loaded) setLoaded(true);
          }}
        />
      )}
      {urlVelo && (
        // eslint-disable-next-line @next/next/no-img-element -- no se ve: solo carga la máscara a su debido tiempo y avisa cuándo está lista
        <img
          src={urlVelo}
          alt=""
          aria-hidden
          crossOrigin="anonymous"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setVeloCargado(urlVelo)}
          onError={() => setSinEspera(true)}
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0 && veloCargado !== urlVelo) {
              setVeloCargado(urlVelo);
            }
          }}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      )}
      {urlVelo && veloListo && (
        // Se desborda un píxel: al escalar la máscara, su orilla se mezcla con lo
        // transparente de afuera y dejaba asomar una línea negra de la foto. Entra
        // con la misma transición que la foto: sin ella, durante medio segundo se
        // veía la silueta del producto vacía.
        <div
          aria-hidden
          className={`mascara-fondo pointer-events-none absolute -inset-px transition-opacity duration-500 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          style={{ "--mascara": `url("${urlVelo}")` } as CSSProperties}
        />
      )}
    </div>
  );
}
