"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MagnifyingGlassMinus, MagnifyingGlassPlus, X } from "@/components/ui/iconos";
import {
  VISTA_INICIAL,
  rectDeVista,
  vistaLimitada,
  zoomEnPunto,
  zoomMaximo,
  type Vista,
} from "@/lib/images/encuadre";

const FACTOR_BOTON = 1.6;
const FACTOR_TECLADO = 1.15;
const PASO_TECLADO = 0.05; // fracción de la ventana por pulsación de flecha
const ZOOM_DOBLE_TOQUE = 2.5;
const DOBLE_TOQUE_MS = 300;

const BOTON =
  "flex size-11 shrink-0 items-center justify-center rounded text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 disabled:hover:bg-transparent";

/**
 * Visor a pantalla completa de la ficha. Siempre enseña la foto ORIGINAL, también
 * con el fondo blanco prendido: acercarse sirve para revisar el producto real.
 *
 * La matemática es la del curador de /admin (`lib/images/encuadre.ts`), pero aquí
 * no se decide un recorte, así que no comparte su Editor. El derivado `lg` solo se
 * baja al abrir, con el `md` que ya está en caché debajo mientras llega.
 *
 * `<dialog>` da gratis la capa superior, la trampa de foco y Esc. Va fuera del
 * carrusel: los eventos de React atraviesan portales, y las flechas de aquí
 * moverían las fotos de atrás.
 */
export function VisorZoom({
  srcBase,
  srcDetalle,
  alt,
  ancho,
  alto,
  onCerrar,
}: {
  srcBase: string;
  srcDetalle: string;
  alt: string;
  ancho: number;
  alto: number;
  onCerrar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const marco = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState<Vista>(VISTA_INICIAL);
  const [detalleListo, setDetalleListo] = useState(false);
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const distanciaPrevia = useRef<number | null>(null);
  const ultimoToque = useRef(0);

  useEffect(() => {
    const el = dialogo.current;
    if (el && !el.open) el.showModal();
    marco.current?.focus();
    // Sin esto, arrastrar la foto en el celular arrastra la ficha de atrás.
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  const acercar = useCallback(
    (factor: number, fx = 0.5, fy = 0.5) =>
      setVista((v) => zoomEnPunto(v, ancho, alto, fx, fy, factor)),
    [ancho, alto]
  );

  // Listener nativo: React registra la rueda como pasiva, y sin `preventDefault`
  // el pellizco del trackpad haría zoom a toda la página en vez de a la foto.
  useEffect(() => {
    const el = marco.current;
    if (!el) return;
    const alRodar = (e: WheelEvent) => {
      e.preventDefault();
      const caja = el.getBoundingClientRect();
      if (!caja.width) return;
      acercar(
        Math.exp(-e.deltaY * 0.0015),
        (e.clientX - caja.left) / caja.width,
        (e.clientY - caja.top) / caja.height
      );
    };
    el.addEventListener("wheel", alRodar, { passive: false });
    return () => el.removeEventListener("wheel", alRodar);
  }, [acercar]);

  /** Desplaza la ventana `dx`/`dy` píxeles de pantalla; la foto sigue al dedo. */
  function desplazar(dx: number, dy: number) {
    const anchoMarco = marco.current?.getBoundingClientRect().width;
    if (!anchoMarco) return;
    setVista((v) => {
      const escala = rectDeVista(v, ancho, alto).lado / anchoMarco;
      return vistaLimitada(
        { ...v, cx: v.cx - (dx * escala) / ancho, cy: v.cy - (dy * escala) / alto },
        ancho,
        alto
      );
    });
  }

  function fraccionEnMarco(x: number, y: number) {
    const caja = marco.current?.getBoundingClientRect();
    if (!caja?.width) return { fx: 0.5, fy: 0.5 };
    return { fx: (x - caja.left) / caja.width, fy: (y - caja.top) / caja.height };
  }

  function distanciaEntrePunteros(): number | null {
    const [a, b] = Array.from(punteros.current.values());
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
  }

  function alBajarPuntero(e: React.PointerEvent<HTMLDivElement>) {
    // Lanza si el puntero ya se soltó; perder la captura no debe costar el gesto.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.current.size === 2) {
      distanciaPrevia.current = distanciaEntrePunteros();
      return;
    }
    // Doble toque a mano: `dblclick` no es confiable con `touch-action: none`.
    const ahora = e.timeStamp;
    if (ahora - ultimoToque.current < DOBLE_TOQUE_MS) {
      const { fx, fy } = fraccionEnMarco(e.clientX, e.clientY);
      setVista((v) =>
        v.zoom > 1 ? VISTA_INICIAL : zoomEnPunto(v, ancho, alto, fx, fy, ZOOM_DOBLE_TOQUE)
      );
      ultimoToque.current = 0;
    } else {
      ultimoToque.current = ahora;
    }
  }

  function alMoverPuntero(e: React.PointerEvent<HTMLDivElement>) {
    const previo = punteros.current.get(e.pointerId);
    if (!previo) return;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (punteros.current.size >= 2) {
      const distancia = distanciaEntrePunteros();
      const anterior = distanciaPrevia.current;
      distanciaPrevia.current = distancia;
      if (!distancia || !anterior) return;
      const [a, b] = Array.from(punteros.current.values());
      const { fx, fy } = fraccionEnMarco((a.x + b.x) / 2, (a.y + b.y) / 2);
      acercar(distancia / anterior, fx, fy);
      return;
    }
    desplazar(e.clientX - previo.x, e.clientY - previo.y);
  }

  function alSoltarPuntero(e: React.PointerEvent<HTMLDivElement>) {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) distanciaPrevia.current = null;
  }

  function alTeclear(e: React.KeyboardEvent<HTMLDialogElement>) {
    const anchoMarco = marco.current?.getBoundingClientRect().width ?? 0;
    const paso = anchoMarco * PASO_TECLADO;
    switch (e.key) {
      case "ArrowLeft": desplazar(paso, 0); break;
      case "ArrowRight": desplazar(-paso, 0); break;
      case "ArrowUp": desplazar(0, paso); break;
      case "ArrowDown": desplazar(0, -paso); break;
      case "+": case "=": acercar(FACTOR_TECLADO); break;
      case "-": case "_": acercar(1 / FACTOR_TECLADO); break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  const tope = zoomMaximo(ancho, alto);
  const { left, top, lado } = rectDeVista(vista, ancho, alto);
  const pct = (fraccion: number) => `${fraccion * 100}%`;
  const estiloFoto = {
    left: pct(-left / lado),
    top: pct(-top / lado),
    width: pct(ancho / lado),
    height: pct(alto / lado),
    // El preflight de Tailwind topa `img` al ancho de su caja y aplastaría la foto.
    maxWidth: "none",
  };

  return (
    <dialog
      ref={dialogo}
      aria-label={`Ver de cerca: ${alt}`}
      onClose={onCerrar}
      onKeyDown={alTeclear}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialogo.current?.close();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none flex-col border-0 bg-ink-deep/95 p-0 text-white backdrop:bg-ink-deep/80 open:flex"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-2">
        <p className="min-w-0 truncate text-sm font-semibold">{alt}</p>
        <button
          type="button"
          onClick={() => dialogo.current?.close()}
          aria-label="Cerrar"
          className={BOTON}
        >
          <X className="size-6" aria-hidden />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <div
          ref={marco}
          tabIndex={0}
          role="application"
          aria-label="Foto: arrastra para mover, rueda o pellizca para acercar"
          onPointerDown={alBajarPuntero}
          onPointerMove={alMoverPuntero}
          onPointerUp={alSoltarPuntero}
          onPointerCancel={alSoltarPuntero}
          className="relative aspect-square w-full max-w-[min(100vw,calc(100dvh-8.5rem))] cursor-grab touch-none select-none overflow-hidden rounded bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:cursor-grabbing"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- derivado directo del CDN, igual que TelaImage */}
          <img src={srcBase} alt="" draggable={false} className="absolute" style={estiloFoto} />
          {/* eslint-disable-next-line @next/next/no-img-element -- derivado lg directo del CDN: es el zoom para el que existe */}
          <img
            src={srcDetalle}
            alt={alt}
            draggable={false}
            onLoad={() => setDetalleListo(true)}
            className={`absolute transition-opacity duration-300 ${detalleListo ? "opacity-100" : "opacity-0"}`}
            style={estiloFoto}
          />
        </div>
      </div>

      <footer className="flex flex-col items-center gap-1 px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => acercar(1 / FACTOR_BOTON)}
            disabled={vista.zoom <= 1}
            aria-label="Alejar"
            className={BOTON}
          >
            <MagnifyingGlassMinus className="size-6" aria-hidden />
          </button>
          <span className="w-14 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {Math.round(vista.zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => acercar(FACTOR_BOTON)}
            disabled={vista.zoom >= tope}
            aria-label="Acercar"
            className={BOTON}
          >
            <MagnifyingGlassPlus className="size-6" aria-hidden />
          </button>
        </div>
        <p className="text-center text-sm text-white/80">
          Pellizca o toca dos veces para acercar, y arrastra para mover.
        </p>
      </footer>
    </dialog>
  );
}
