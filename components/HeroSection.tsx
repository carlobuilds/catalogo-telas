"use client";

import Image from "next/image";
import { TutorialTrigger } from "@/components/tutorial/TutorialTrigger";
import type { Catalogo } from "@/lib/catalogos";
import { ArrowDown, CaretDown, Diamond, Ruler, SealCheck, WhatsappLogo } from "@/components/ui/iconos";

interface HeroSectionProps {
  catalogo: Catalogo;
}

/**
 * Lo que cambia entre catálogos. La mercería no se corta a la medida ni se
 * cotiza en metros: prometer eso en su portada sería mentirle al cliente.
 */
const TEXTO: Record<
  Catalogo,
  { titulo: string; parrafo: string; pildora: { Icono: typeof Ruler; texto: string } }
> = {
  merceria: {
    titulo: "Cristalería, pedrería y mercería para tus creaciones.",
    parrafo:
      "Piedra suelta, aplicaciones, tiras y cintillos de pedrería, encajes, flores y todo lo de costura. Cotiza por pieza, par o bolsa y recibe atención directa por WhatsApp.",
    pildora: { Icono: Diamond, texto: "Por pieza, par o bolsa" },
  },
  telas: {
    titulo: "Telas finas para tus creaciones.",
    parrafo:
      "Tul, chifón y tul bordado para vestidos de fiesta, novia y XV años. Cotiza fácilmente tus metros y recibe atención directa por WhatsApp.",
    pildora: { Icono: Ruler, texto: "Corte a tu medida" },
  },
};

export function HeroSection({ catalogo }: HeroSectionProps) {
  const texto = TEXTO[catalogo];
  const scrollToCatalog = () => {
    const catalogElement = document.getElementById("catalogo-seccion");
    if (catalogElement) {
      const offset = 70; // altura aproximada del header sticky
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = catalogElement.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="relative w-full overflow-hidden border-b border-line/70 bg-gradient-to-b from-sand-bg via-surface-container-low/60 to-sand-bg -mt-16 pt-16">
      {/* Fondo decorativo con luces sutiles */}
      <div aria-hidden className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-amber/5 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 top-40 h-80 w-80 rounded-full bg-heritage-navy/5 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6 sm:pt-10 sm:pb-12 lg:px-8 lg:pt-12 lg:pb-14">
        {/* Layout en 2 columnas para Desktop (lg+) y vertical armónico en Móvil */}
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">

          {/* Columna Izquierda: Información de Marca, Mensaje y Acciones */}
          <div className="flex flex-col lg:col-span-7">
            {/* Título Principal de Alto Impacto */}
            <h1 className="min-w-0 break-words font-display text-3xl font-bold tracking-tight text-ink-display sm:text-5xl lg:text-[3.25rem] sm:leading-[1.15]">
              {texto.titulo}
            </h1>

            {/* Descripción / Propuesta de Valor */}
            <p className="mt-3.5 text-base sm:text-lg text-ink-text/85 max-w-2xl leading-relaxed">
              {texto.parrafo}
            </p>

            {/* Píldoras de valor y ventajas */}
            {/* El icono de "Calidad garantizada" era morado: un glifo de fuente
                es texto, y el morado es solo para acciones. */}
            <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5 text-sm font-semibold text-ink-soft">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container-lowest/90 px-3 py-1.5 shadow-2xs">
                <texto.pildora.Icono className="size-4.5 text-amber" />
                <span>{texto.pildora.texto}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container-lowest/90 px-3 py-1.5 shadow-2xs">
                <WhatsappLogo className="size-4.5 text-whatsapp" />
                <span>Cotización directa en WhatsApp</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container-lowest/90 px-3 py-1.5 shadow-2xs">
                <SealCheck className="size-4.5 text-amber" />
                <span>Calidad garantizada</span>
              </span>
            </div>

            {/* Acciones Principales: Explorar Catálogo + Tutorial. Lado a lado
                solo cuando caben (md, y de nuevo en xl); en sm y en lg la
                columna es angosta y la tarjeta de la guía quedaba en ~320px
                con el texto partido en cinco renglones (antes se truncaba,
                que es peor: se perdía lo que dice). */}
            <div className="mt-7 flex flex-col items-stretch gap-3.5 md:flex-row md:items-center lg:flex-col lg:items-start xl:flex-row xl:items-center">
              <button
                type="button"
                onClick={scrollToCatalog}
                className="group inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded bg-heritage-navy px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-deep-slate hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy focus-visible:ring-offset-2"
              >
                Ver el catálogo
                <ArrowDown className="size-6 transition-transform group-hover:translate-y-0.5" />
              </button>

              <TutorialTrigger variant="hero-banner" className="flex-1 md:max-w-md" />
            </div>
          </div>

          {/* Columna Derecha: Vitrina Visual de Telas de Alta Gama. La foto va sola,
              sin velo ni textos encima: el color es el producto. */}
          <div className="relative lg:col-span-5">
            <div className="relative mx-auto aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] w-full max-w-lg overflow-hidden rounded-xl border border-line-strong/60 bg-surface-container-highest shadow-xl transition-transform duration-300 hover:scale-[1.01]">
              <Image
                src="/hero-encajes.webp"
                alt="Selección de encajes bordados y telas finas de Telas La Jalisciense"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, (min-width: 640px) 70vw, 90vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Indicador de Deslizamiento Inferior (Scroll Nudge) */}
        <div className="mt-6 flex justify-center sm:mt-8">
          {/* Sin aria-label: el nombre es el texto visible ("Ver colección
              completa"); antes decía otra cosa y quien navega por voz no
              podía nombrarlo. */}
          <button
            type="button"
            onClick={scrollToCatalog}
            className="group flex min-h-[44px] flex-col items-center justify-center gap-1 rounded px-3 text-sm font-bold text-ink-soft transition-colors hover:text-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
          >
            <span className="text-sm font-semibold text-ink-soft group-hover:text-amber">
              Ver colección completa
            </span>
            <CaretDown className="size-5 text-amber animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}
