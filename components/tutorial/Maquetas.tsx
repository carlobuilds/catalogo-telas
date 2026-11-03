"use client";

import { ColorSwatch } from "@/components/ColorSwatch";
import { TelaImage } from "@/components/TelaImage";
import {
  MagnifyingGlass,
  Minus,
  Plus,
  ShoppingBag,
  Sparkle,
  WhatsappLogo,
} from "@/components/ui/iconos";
import { CATALOGOS, CATALOGO_PORTADA, ORDEN_CATALOGOS, SECCIONES_MERCERIA } from "@/lib/catalogos";
import { publicImageUrl } from "@/lib/supabase/storage";
import { cantidadCorta, etiquetaStepper, unidadDe, type UnidadVenta } from "@/lib/unidades";
import { pesos } from "@/lib/whatsapp-message";

/**
 * MAQUETAS del tutorial — representaciones visuales de la tienda en chiquito,
 * acordes al sistema de diseño "Artisanal Modernity" (Atelier Textil).
 *
 * Los artículos son de verdad: nombre, precio, unidad, colores y foto copiados
 * de la vista `catalogo_telas` el 2026-11-03, de entre los que la tienda ya
 * revisó. La dueña conoce su mercancía y este modal se abre solo en la primera
 * visita: un producto inventado se nota de inmediato.
 *
 * Es una foto fija y no una lectura porque el modal se monta en toda la vitrina
 * y una ilustración no justifica otra consulta. Si la tienda cambia uno de estos
 * precios, se actualiza aquí.
 */

type Articulo = {
  nombre: string;
  categoria: string;
  precio: number;
  unidad: UnidadVenta;
  color: string;
  /** Derivado `sm` dentro del bucket: ya viene cuadrado y a 800px. */
  foto: string;
};

const MARIPOSA: Articulo = {
  nombre: "Mariposa bordada",
  categoria: "Aplicación de pedrería",
  precio: 25,
  unidad: "pieza",
  color: "Rosado",
  foto: "derivados/sm/butterfly/butterfly00210.webp",
};

const APLICACION: Articulo = {
  nombre: "Aplicación de encaje con flores 3D",
  categoria: "Aplicación bordada",
  precio: 50,
  unidad: "par",
  color: "Rojo",
  foto: "derivados/sm/motivos/motivos00033.webp",
};

const BOLSA: Articulo = {
  nombre: "Bolsa de piedras · 25 pz",
  categoria: "Piedra suelta",
  precio: 18,
  unidad: "bolsa",
  color: "Oro",
  foto: "derivados/sm/bolsa-de-piedras-25-pz-00025/bolsitapiedras00025.webp",
};

const TONOS_MARIPOSA = [
  { nombre: "Negro", hex: "#1A1714" },
  { nombre: "Rosado", hex: "#EFA3B8" },
  { nombre: "Azul Marino", hex: "#1E2A4A" },
  { nombre: "Champagne", hex: "#E4CFA8" },
  { nombre: "Azul", hex: "#2E5BB7" },
  { nombre: "Blanco", hex: "#FFFFFF" },
  { nombre: "Celeste", hex: "#9CC6DC" },
  { nombre: "Oro Blanco", hex: "#FBFAE0" },
  { nombre: "Oro", hex: "#C9A227" },
  { nombre: "Blush", hex: "#E8C4BC" },
  { nombre: "Lila", hex: "#B57EDC" },
  { nombre: "Verde Botella", hex: "#1B4D3E" },
  { nombre: "Vino", hex: "#7B1B2B" },
  { nombre: "Rojo", hex: "#C1272D" },
];

/** La historia de los cuatro pasos: la cesta trae la mariposa del paso 3. */
const CANTIDAD_MARIPOSA = 6;

const CESTA = [
  { articulo: MARIPOSA, cantidad: CANTIDAD_MARIPOSA },
  { articulo: APLICACION, cantidad: 1 },
  { articulo: BOLSA, cantidad: 1 },
];

const TOTAL_CESTA = CESTA.reduce((suma, r) => suma + r.articulo.precio * r.cantidad, 0);

function Marco({ children }: { children: React.ReactNode }) {
  return (
    // `data-maqueta`: estas miniaturas imitan la pantalla en chiquito y quedan
    // FUERA de la regla de 14px mínimos — son ilustración, no texto a leer.
    <div
      aria-hidden
      data-maqueta
      className="select-none overflow-hidden rounded border border-line/80 bg-surface-container-lowest shadow-sm"
    >
      {/* Barra superior de la maqueta (Atelier Window Bar) */}
      <div className="flex h-9 items-center justify-between border-b border-line/60 bg-surface-container-low/70 px-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber/60" />
          <span className="font-display text-[11px] font-bold tracking-tight text-ink-display">
            Telas La Jalisciense
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded bg-surface-container px-2 py-0.5 text-[9px] font-semibold text-amber">
          <Sparkle className="h-2.5 w-2.5" />
          <span>Catálogo</span>
        </span>
      </div>
      <div className="bg-sand-bg/25 p-3 sm:p-3.5">{children}</div>
    </div>
  );
}

function Foco({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute -inset-1.5 animate-halo rounded ring-2 ring-amber/80 ring-offset-2 ring-offset-surface-container-lowest" />
    </div>
  );
}

function Foto({ ruta }: { ruta: string }) {
  return (
    <div className="overflow-hidden rounded">
      <TelaImage
        src={publicImageUrl(ruta)}
        derivados={{ sm: { ruta, ancho: 800, alto: 800 } }}
        sizes="200px"
        alt=""
      />
    </div>
  );
}

function Precio({ articulo, className }: { articulo: Articulo; className: string }) {
  return (
    <p className={`font-bold leading-tight text-amber ${className}`}>
      {pesos.format(articulo.precio)}
      {/* A 320px "$25.00/pieza" no cabe en una mini card: baja la unidad, no se corta. */}
      <wbr />
      <span className="font-medium text-ink-soft">{unidadDe(articulo.unidad).sufijoPrecio}</span>
    </p>
  );
}

function MiniCard({ articulo }: { articulo: Articulo }) {
  return (
    <div className="flex flex-col gap-1.5 rounded border border-line/60 bg-surface-container-lowest p-1.5 shadow-2xs sm:p-2">
      <Foto ruta={articulo.foto} />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[9px] font-semibold leading-tight text-amber">
          {articulo.categoria}
        </span>
        <p className="font-display text-[11px] font-bold leading-tight text-ink-display">
          {articulo.nombre}
        </p>
        <Precio articulo={articulo} className="mt-auto pt-0.5 text-[11px]" />
      </div>
    </div>
  );
}

export function MaquetaBuscar() {
  return (
    <Marco>
      {/* Mercería / Telas, como en la barra del catálogo */}
      <div className="mb-3.5 flex gap-1 rounded border border-outline-variant/40 bg-surface-container-lowest p-0.5">
        {ORDEN_CATALOGOS.map((c) => (
          <span
            key={c}
            className={`flex-1 rounded py-1 text-center text-[10px] font-bold ${
              c === CATALOGO_PORTADA ? "bg-heritage-navy text-white" : "text-ink-display"
            }`}
          >
            {CATALOGOS[c].nombre}
          </span>
        ))}
      </div>

      <Foco>
        <div className="flex items-center gap-2 rounded border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 shadow-xs">
          <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-amber" />
          <span className="text-[11px] font-medium text-ink-soft">
            Busca por nombre, color o código
          </span>
        </div>
      </Foco>

      {/* Mini chips de sección */}
      <div className="mt-3.5 flex gap-1.5 overflow-hidden">
        <span className="shrink-0 rounded bg-heritage-navy px-2.5 py-1 text-[9px] font-bold text-white shadow-2xs">
          Todo
        </span>
        {SECCIONES_MERCERIA.map((s) => (
          <span
            key={s.slug}
            className="shrink-0 rounded border border-line/60 bg-surface-container-lowest px-2.5 py-1 text-[9px] font-semibold text-ink-text"
          >
            {s.nombre}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
        <MiniCard articulo={MARIPOSA} />
        <MiniCard articulo={APLICACION} />
        <MiniCard articulo={BOLSA} />
      </div>
    </Marco>
  );
}

export function MaquetaColor() {
  return (
    <Marco>
      <div className="flex items-center gap-3">
        <div className="w-[42%] shrink-0">
          <Foto ruta={MARIPOSA.foto} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <div>
            <span className="text-[9px] font-semibold text-amber">{MARIPOSA.categoria}</span>
            <p className="font-display text-sm font-bold leading-tight text-ink-display">
              {MARIPOSA.nombre}
            </p>
            <Precio articulo={MARIPOSA} className="text-xs" />
          </div>

          <div className="mt-1 border-t border-line/40 pt-1.5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-semibold text-ink-display">Tonos disponibles</span>
              <span className="text-[10px] font-medium text-ink-text">{MARIPOSA.color}</span>
            </div>
            <Foco>
              <div className="flex flex-wrap gap-1.5 rounded border border-line/50 bg-surface-container-lowest p-1.5">
                {TONOS_MARIPOSA.map((t) => (
                  <ColorSwatch
                    key={t.nombre}
                    hex={t.hex}
                    nombre={t.nombre}
                    size="sm"
                    selected={t.nombre === MARIPOSA.color}
                  />
                ))}
              </div>
            </Foco>
          </div>
        </div>
      </div>
    </Marco>
  );
}

export function MaquetaCantidad() {
  return (
    <Marco>
      <div className="flex items-center gap-3">
        <div className="w-[36%] shrink-0">
          <Foto ruta={MARIPOSA.foto} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3.5">
          <div>
            <p className="font-display text-xs font-bold leading-tight text-ink-display">
              {MARIPOSA.nombre} {MARIPOSA.color}
            </p>
            <Precio articulo={MARIPOSA} className="mt-0.5 text-[11px]" />
          </div>

          <Foco>
            <div className="flex flex-col gap-1.5">
              {/* Stepper idéntico a AddToCart */}
              <div className="flex items-center justify-between rounded border border-line/60 bg-surface-container px-1.5 py-1 shadow-inner-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-surface-container-lowest text-ink-display shadow-2xs">
                  <Minus className="h-3 w-3" />
                </span>
                <div className="text-center leading-none">
                  <span className="block text-xs font-bold text-ink-display">
                    {CANTIDAD_MARIPOSA}
                  </span>
                  <span className="text-[9px] font-semibold text-amber">
                    {etiquetaStepper(MARIPOSA.unidad)}
                  </span>
                </div>
                <span className="flex h-6 w-6 items-center justify-center rounded bg-surface-container-lowest text-ink-display shadow-2xs">
                  <Plus className="h-3 w-3" />
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5 rounded bg-heritage-navy py-2 text-white shadow-xs">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold">Añadir a la Cesta</span>
              </div>
            </div>
          </Foco>
        </div>
      </div>
    </Marco>
  );
}

export function MaquetaWhatsapp() {
  return (
    <Marco>
      <div className="flex items-center gap-1.5">
        <ShoppingBag className="h-3.5 w-3.5 text-amber" />
        <span className="font-display text-xs font-bold text-ink-display">Tu Cesta</span>
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {CESTA.map(({ articulo, cantidad }) => (
          <div
            key={articulo.nombre}
            className="flex items-center gap-2 rounded border border-line/60 bg-surface-container-lowest p-1.5 shadow-2xs"
          >
            <div className="w-8 shrink-0">
              <Foto ruta={articulo.foto} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold leading-tight text-ink-display">
                {articulo.nombre}
              </p>
              <p className="text-[9px] leading-tight text-ink-soft">
                {articulo.color} · {cantidadCorta(cantidad, articulo.unidad)}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-amber">
              {pesos.format(articulo.precio * cantidad)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between px-0.5">
        <span className="text-[10px] font-semibold text-ink-soft">Total estimado</span>
        <span className="font-display text-sm font-bold text-amber">
          {pesos.format(TOTAL_CESTA)}
        </span>
      </div>

      <div className="mt-3.5">
        <Foco>
          <div className="flex items-center justify-center gap-1.5 rounded bg-whatsapp px-3 py-2 text-white shadow-xs">
            <WhatsappLogo className="h-3.5 w-3.5" weight="fill" />
            <span className="text-[11px] font-bold">Enviar pedido por WhatsApp</span>
          </div>
        </Foco>
        <p className="mt-3 text-center text-[9px] leading-tight text-ink-soft">
          Es una estimación. Confirmamos disponibilidad y apartado por WhatsApp.
        </p>
      </div>
    </Marco>
  );
}
