import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTelaPorSlug, getFotosDeVariantes } from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase/storage";
import { construirSlides } from "@/lib/fotos";
import { TelaImage } from "@/components/TelaImage";
import { TelaImageCarousel } from "@/components/TelaImageCarousel";
import { ColorSelector } from "@/components/ColorSelector";
import { AttributeBadges } from "@/components/AttributeBadges";
import { AddToCart } from "@/components/AddToCart";
import { VolverAlCatalogo } from "@/components/VolverAlCatalogo";
import { unidadDe } from "@/lib/unidades";
import { CATALOGOS, catalogoDeCategoria, rutaDeCatalogo } from "@/lib/catalogos";

const pesos = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { color } = await searchParams;

  const variantes = await getTelaPorSlug(slug);
  if (variantes.length === 0) notFound();

  const seleccionada =
    variantes.find((v) => v.color_slug === color) ?? variantes[0];

  const nombre = seleccionada.color_nombre
    ? `${seleccionada.tela_nombre} · ${seleccionada.color_nombre}`
    : seleccionada.tela_nombre;

  const totalColores = new Set(
    variantes.map((v) => v.color_slug ?? v.variante_id)
  ).size;

  // Sin `descripcion` a propósito: la tienda pidió que no se muestre en el
  // catálogo público, y la vista previa del link en WhatsApp también es público.
  const descripcion = [
    seleccionada.categoria,
    totalColores > 1 ? `${totalColores} colores` : null,
    "Telas La Jalisciense · Fresnillo",
  ]
    .filter(Boolean)
    .join(" · ");

  const foto = publicImageUrl(seleccionada.foto_principal);

  return {
    title: `${nombre} — Telas La Jalisciense`,
    description: descripcion,
    openGraph: {
      title: nombre,
      description: descripcion,
      ...(foto ? { images: [{ url: foto, alt: nombre }] } : {}),
    },
  };
}

export default async function TelaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string }>;
}) {
  const { slug } = await params;
  const { color } = await searchParams;

  const variantes = await getTelaPorSlug(slug);
  if (variantes.length === 0) notFound();

  const seleccionada =
    variantes.find((v) => v.color_slug === color) ?? variantes[0];

  const foto = publicImageUrl(seleccionada.foto_principal);
  const nombre = seleccionada.tela_nombre;

  const atributos = {
    es_bordado: seleccionada.es_bordado,
    es_brillante: seleccionada.es_brillante,
    es_traslucida: seleccionada.es_traslucida,
    es_tornasol: seleccionada.es_tornasol,
  };

  const tags = [...seleccionada.casos_uso, ...seleccionada.oportunidades];
  // Todas las variantes comparten la categoría del modelo.
  const catalogo = catalogoDeCategoria(seleccionada.categoria_slug);
  const unidad = unidadDe(seleccionada.unidad_venta);

  // Chips de venta, salidos de los datos de ESTA variante y no de un texto
  // fijo: antes decía "Venta por metro o pieza" en cualquier tela, y en la
  // mercería no decía nada. La unidad decide todo (lib/unidades.ts):
  //  - "Se vende por …" siempre, porque `unidadDe` cae a metro sin dato.
  //  - Piezas por unidad solo en las EMPACADAS (bolsa, rollo, juego): "25
  //    piezas por pieza" no significa nada, y el metro no empaqueta.
  //  - La medida (diámetro de flor, ancho de tira…) solo si la capturaron.
  // El ancho de rollo solo existe en la tela: en una bolsita de piedras o un
  // botón era un dato falso.
  const piezas = seleccionada.piezas_por_unidad;
  const medida = seleccionada.medida?.trim();
  const chipsVenta = [
    catalogo === "telas" ? "Ancho: 1.40m – 1.50m" : null,
    `Se vende por ${unidad.singular}`,
    unidad.empacada && piezas
      ? `${piezas} ${piezas === 1 ? "pieza" : "piezas"} por ${unidad.singular}`
      : null,
    medida ? `Medida: ${medida}` : null,
  ].filter((c): c is string => c !== null);

  const fotos = await getFotosDeVariantes(variantes.map((v) => v.variante_id));
  const slides = construirSlides({ variantes, fotos, seleccionada });
  const usarCarrusel = slides.length > 1;

  // pb extra en móvil: reserva espacio para la barra fija de AddToCart
  // (~5.1rem). La de MobileBottomNav (4rem + safe-area) ya la reserva el
  // `pb` del <body> en el layout; antes se contaba aquí también y sobraban
  // 4rem bajo la ficha. En sm+ ninguna de las dos es fixed.
  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-[5.5rem] sm:px-6 sm:pb-8 lg:px-8">
      <VolverAlCatalogo href={rutaDeCatalogo(catalogo)} nombre={CATALOGOS[catalogo].nombre} />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Columna Izquierda: Galería / Imagen & Swatches */}
        <div className="flex flex-col gap-6 min-w-0">
          {usarCarrusel ? (
            <div className="overflow-hidden rounded border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
              <TelaImageCarousel
                slides={slides}
                selectedColorSlug={seleccionada.color_slug}
                telaNombre={nombre}
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded border border-outline-variant/30 bg-surface-container-lowest p-2 shadow-sm">
              <div className="relative aspect-square overflow-hidden rounded bg-surface-container-low">
                <TelaImage
                  src={slides[0] ? publicImageUrl(slides[0].ruta) : foto}
                  derivados={
                    slides[0]?.derivados ?? seleccionada.foto_principal_derivados
                  }
                  sizes="(max-width: 1023px) 100vw, 50vw"
                  alt={
                    seleccionada.color_nombre
                      ? `${nombre} ${seleccionada.color_nombre}`
                      : nombre
                  }
                  aspecto="cuadrado"
                  priority
                />
              </div>
            </div>
          )}

          {/* En mobile, "Tonos disponibles" va justo bajo la foto */}
          <div className="lg:hidden">
            <ColorSelector
              variantes={variantes}
              selectedSlug={seleccionada.color_slug}
            />
          </div>
        </div>

        {/* Columna Derecha: Información, Especificaciones y Cotización */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            {seleccionada.categoria && (
              <span className="text-label-caps text-xs text-amber">
                {seleccionada.categoria}
              </span>
            )}
            <div className="flex items-start justify-between gap-4">
              <h1 className="min-w-0 break-words font-display text-3xl font-bold text-ink-display sm:text-4xl">
                {nombre}
              </h1>
              {seleccionada.precio_metro != null ? (
                <div className="shrink-0 text-right">
                  <p className="text-2xl sm:text-3xl font-bold text-amber">
                    {pesos.format(seleccionada.precio_metro)}
                  </p>
                  <p className="text-sm font-semibold text-ink-soft">
                    {unidad.sufijoPrecio}
                  </p>
                </div>
              ) : (
                <p className="shrink-0 pt-1 text-sm font-medium text-ink-soft">
                  Precio a consultar
                </p>
              )}
            </div>
            {seleccionada.precio_es_referencia && (
              <p className="text-sm text-amber-soft font-medium">
                * Precio de referencia · confirmamos disponibilidad por WhatsApp
              </p>
            )}
          </div>

          {/* Chips de propiedades (ver `chipsVenta` arriba) */}
          <div className="flex flex-wrap gap-2">
            {chipsVenta.map((chip) => (
              <span
                key={chip}
                className="rounded border border-outline-variant/30 bg-surface-container px-3.5 py-1.5 text-sm font-bold text-ink-display"
              >
                {chip}
              </span>
            ))}
            <AttributeBadges atributos={atributos} />
          </div>

          {/* La descripción NO se muestra en el catálogo público, por decisión
              de la tienda: la clientela no la lee y alarga la ficha en el
              celular. El dato sigue en la BD —se edita en /admin y lo puede
              usar el agente de WhatsApp—, solo deja de pintarse aquí. */}

          {/* Selector de color en Desktop */}
          <div className="hidden lg:block">
            <ColorSelector
              variantes={variantes}
              selectedSlug={seleccionada.color_slug}
            />
          </div>

          {/* "Usos Recomendados": pausado a propósito, no borrado. Es una
              funcionalidad que sí queremos, pero los 4 iconos (Vestidos,
              Pañuelos, Blusas, Decoración) estaban fijos en el JSX — los
              mismos para cualquier tela — sin ningún dato real del producto
              detrás. Antes de reactivarlo hace falta decidir de dónde sale
              el uso recomendado por tela (¿categoría? ¿caso_uso real?) y
              conectarlo a datos, no dejarlo como texto de relleno. */}

          {/* Ficha técnica en cuadrícula */}
          {(seleccionada.sku || seleccionada.stock != null) && (
            <dl className="grid grid-cols-2 gap-3.5">
              {seleccionada.sku && (
                <div className="min-w-0 rounded border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-2xs">
                  <dt className="text-label-caps text-xs text-amber">Código</dt>
                  {/* break-all: un código largo sin espacios desbordaba la
                      media columna a 375px. */}
                  <dd className="mt-1 break-all font-mono text-base font-bold text-ink-display">
                    {seleccionada.sku}
                  </dd>
                </div>
              )}
              {seleccionada.stock != null && (
                <div className="min-w-0 rounded border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-2xs">
                  <dt className="text-label-caps text-xs text-amber">
                    Existencia
                  </dt>
                  {seleccionada.stock > 0 ? (
                    <dd className="mt-1 flex items-start gap-1 text-base font-bold text-success">
                      <span aria-hidden className="material-symbols-outlined mt-0.5 shrink-0 text-[18px]">check_circle</span>
                      <span>
                        {seleccionada.stock}{" "}
                        {seleccionada.stock === 1 ? unidad.singular : unidad.plural}{" "}
                        {seleccionada.stock === 1 ? "disponible" : "disponibles"}
                      </span>
                    </dd>
                  ) : (
                    <dd className="mt-1 text-base font-semibold text-ink-soft">
                      Sin existencia
                    </dd>
                  )}
                </div>
              )}
            </dl>
          )}

          {/* Tags de ocasión */}
          {tags.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-label-caps text-xs text-ink-display">
                Ocasión & Estilo
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded border border-outline-variant/30 bg-surface-container-lowest px-3.5 py-1.5 text-sm font-medium capitalize text-ink-soft shadow-2xs"
                  >
                    {t.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* "Mercería sugerida para este producto": pausado a propósito,
              no borrado — sí es una funcionalidad que queremos, pero falta
              validar con la tienda qué mercería sugerir por categoría antes
              de mostrarlo al público. La lógica sigue viva en
              sugerenciaMerceriaDeCategoria (lib/ingesta/categorias.ts); para
              reactivarlo basta con volver a llamarla aquí y pintar el
              grid de sugerencias. */}

          {/* Agregar a la Cotización */}
          <AddToCart variante={seleccionada} />
        </div>
      </div>
    </main>
  );
}

