"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ArrowLeft, CheckCircle, Plus } from "@/components/ui/iconos";
import { ColorSwatch } from "@/components/ColorSwatch";
import { ModalAdmin, ErrorModal } from "@/components/admin/ModalAdmin";
import { BuscadorProducto, type ProductoEncontrado } from "@/components/admin/BuscadorProducto";
import { useEnterAvanza } from "@/components/admin/useEnterAvanza";
import { normalizar } from "@/lib/busqueda/normalizar";
import type { ColorDestino, OpcionesNuevaVariante } from "@/lib/admin/mover-foto";
import {
  crearProductoYMoverFoto,
  moverFotoANuevaVariante,
  moverFotoAVariante,
  variantesDeProducto,
  type ResultadoMover,
} from "@/app/admin/actions";

/** Un color de un producto, como destino de la foto. */
export type VarianteDestino = { id: string; nombre: string; hex: string | null; colorId: string | null };
/** Un color del catálogo de colores (tabla `color`). */
export type ColorCatalogo = { id: string; nombre: string; hex: string | null };

/** A qué producto va la foto cuando se le crea un color nuevo. */
type Destino =
  | { tipo: "este" }
  | { tipo: "otro"; producto: ProductoEncontrado; variantes: VarianteDestino[] }
  | { tipo: "nuevo"; nombre: string };

/**
 * A dónde mandar una foto mal clasificada. Es el camino accesible del drag &
 * drop de `GaleriaFotos` —y el ÚNICO que sirve para "otro producto", que no
 * está en pantalla para arrastrarle nada—.
 *
 * Dos pasos. Primero el DESTINO: un color que ya existe (aquí o en otro
 * producto) o un color nuevo. Si es nuevo, el segundo paso pregunta DE QUÉ
 * COLOR es y su medida. Antes el color nuevo nacía "sin color" y en metro: en
 * la ficha pública no aparecía y una flor salía cobrada "/m".
 *
 * Caso típico que lo motivó: una flor de 5 cm fotografiada junto a la de 3 cm.
 * Otro tamaño es otro PRODUCTO ("Flor con piedra 5 cm"), así que se busca ese
 * producto y se le crea su color.
 */
export function MoverFotoModal({
  fotoId,
  fotoUrl,
  telaId,
  telaNombre,
  placeholderMedida,
  variantesProducto,
  origenId,
  colores,
  pasoInicial = "destino",
  onCerrar,
  onHecho,
}: {
  fotoId: string;
  fotoUrl: string | null;
  telaId: string;
  telaNombre: string;
  placeholderMedida: string;
  /** TODOS los colores de este producto, incluido el de origen. */
  variantesProducto: VarianteDestino[];
  origenId: string;
  colores: ColorCatalogo[];
  /** "color" = abrir directo en "color nuevo de este producto" (zona de arrastre). */
  pasoInicial?: "destino" | "color";
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [destino, setDestino] = useState<Destino | null>(pasoInicial === "color" ? { tipo: "este" } : null);
  const [productoAbierto, setProductoAbierto] = useState<{
    producto: ProductoEncontrado;
    variantes: VarianteDestino[] | null;
  } | null>(null);
  const [resultado, setResultado] = useState<ResultadoMover | null>(null);
  const [guardando, startTransition] = useTransition();

  const hermanas = variantesProducto.filter((v) => v.id !== origenId);

  const correr = useCallback(
    (accion: () => Promise<ResultadoMover>) => {
      setResultado(null);
      startTransition(async () => {
        const res = await accion();
        if (res.error) return setResultado(res);
        onHecho();
      });
    },
    [onHecho]
  );

  const abrirProducto = (producto: ProductoEncontrado) => {
    setProductoAbierto({ producto, variantes: null });
    setResultado(null);
    startTransition(async () => {
      const res = await variantesDeProducto(producto.id);
      if (res.error) return setResultado({ error: res.error });
      setProductoAbierto({ producto, variantes: res.variantes });
    });
  };

  const titulo = destino ? "¿De qué color es?" : "Mover esta foto";

  return (
    <ModalAdmin
      titulo={titulo}
      onCerrar={onCerrar}
      descripcion={
        destino ? (
          <>
            Va a un color nuevo{" "}
            {destino.tipo === "este" && <>de <strong>{telaNombre}</strong></>}
            {destino.tipo === "otro" && <>de <strong>{destino.producto.nombre}</strong></>}
            {destino.tipo === "nuevo" && <>del producto nuevo <strong>{destino.nombre}</strong></>}.
          </>
        ) : (
          "La foto conserva su recorte y sus tamaños; solo cambia de lugar."
        )
      }
    >
      {fotoUrl && (
        <div className="relative mb-4 aspect-square w-32 overflow-hidden rounded border border-line bg-line/40">
          <Image src={fotoUrl} alt="La foto que se va a mover" fill sizes="128px" className="object-cover" />
        </div>
      )}

      {destino ? (
        <PasoColor
          key={destino.tipo === "otro" ? destino.producto.id : destino.tipo}
          colores={colores}
          ocupados={
            destino.tipo === "este"
              ? variantesProducto
              : destino.tipo === "otro"
                ? destino.variantes
                : []
          }
          permitirSinColor={destino.tipo === "nuevo"}
          placeholderMedida={placeholderMedida}
          guardando={guardando}
          resultado={resultado}
          onAtras={() => {
            setDestino(null);
            setResultado(null);
          }}
          onSumarAExistente={(varianteId) => correr(() => moverFotoAVariante(fotoId, varianteId))}
          onConfirmar={(opciones) =>
            correr(() =>
              destino.tipo === "este"
                ? moverFotoANuevaVariante(fotoId, telaId, opciones)
                : destino.tipo === "otro"
                  ? moverFotoANuevaVariante(fotoId, destino.producto.id, opciones)
                  : crearProductoYMoverFoto(fotoId, destino.nombre, opciones)
            )
          }
        />
      ) : (
        <>
          {/* ---------------------------------------- En este mismo producto */}
          <section className="mb-5">
            <h3 className="mb-2 text-base font-semibold text-ink-display">En este producto</h3>
            <div className="flex flex-wrap gap-2">
              {hermanas.map((v) => (
                <BotonDestino
                  key={v.id}
                  variante={v}
                  deshabilitado={guardando}
                  onClick={() => correr(() => moverFotoAVariante(fotoId, v.id))}
                />
              ))}
              <BotonNuevo deshabilitado={guardando} onClick={() => setDestino({ tipo: "este" })}>
                Nuevo color
              </BotonNuevo>
            </div>
            {hermanas.length === 0 && (
              <p className="mt-2 text-sm text-ink-soft">
                Este producto tiene un solo color. “Nuevo color” crea otro y le pasa esta foto.
              </p>
            )}
          </section>

          {/* ------------------------------------------------- En otro producto */}
          <section className="border-t border-line pt-4">
            <h3 className="mb-1 text-base font-semibold text-ink-display">En otro producto</h3>
            <p className="mb-2 text-sm text-ink-soft">
              ¿Es el mismo artículo en <strong>otro tamaño</strong>? Va en el producto de esa medida.
            </p>

            {productoAbierto ? (
              <div className="rounded border border-line bg-bg p-3">
                <p className="mb-2 text-base font-semibold text-ink-display">{productoAbierto.producto.nombre}</p>
                <div className="flex flex-wrap gap-2">
                  {(productoAbierto.variantes ?? []).map((v) => (
                    <BotonDestino
                      key={v.id}
                      variante={v}
                      deshabilitado={guardando}
                      onClick={() => correr(() => moverFotoAVariante(fotoId, v.id))}
                    />
                  ))}
                  {productoAbierto.variantes && (
                    <BotonNuevo
                      deshabilitado={guardando}
                      onClick={() =>
                        setDestino({
                          tipo: "otro",
                          producto: productoAbierto.producto,
                          variantes: productoAbierto.variantes ?? [],
                        })
                      }
                    >
                      Nuevo color aquí
                    </BotonNuevo>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setProductoAbierto(null)}
                  className="mt-2 inline-flex min-h-11 items-center rounded text-base font-semibold text-ink-display underline decoration-heritage-navy/50 underline-offset-4 hover:decoration-heritage-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
                >
                  Elegir otro producto
                </button>
              </div>
            ) : (
              <BuscadorProducto
                excluirId={telaId}
                deshabilitado={guardando}
                etiquetaCrear={(nombre) => `Crear producto “${nombre}” con esta foto`}
                onElegir={abrirProducto}
                onCrear={(nombre) => setDestino({ tipo: "nuevo", nombre })}
              />
            )}
          </section>

          {resultado?.error && <ErrorModal>{resultado.error}</ErrorModal>}
        </>
      )}

      <p className="mt-4 text-sm text-ink-soft" aria-live="polite">
        {guardando ? "Moviendo…" : ""}
      </p>
    </ModalAdmin>
  );
}

/**
 * Segundo paso: el color (y la medida) del color nuevo. Los colores que el
 * producto ya tiene se marcan: elegirlos SUMA la foto a ese color en vez de
 * crear otro igual, que en la ficha no se podría ver.
 */
function PasoColor({
  colores,
  ocupados,
  permitirSinColor,
  placeholderMedida,
  guardando,
  resultado,
  onAtras,
  onConfirmar,
  onSumarAExistente,
}: {
  colores: ColorCatalogo[];
  /** Colores que el producto de destino YA tiene. */
  ocupados: VarianteDestino[];
  /** Solo en un producto nuevo: una bolsita puede no tener color. */
  permitirSinColor: boolean;
  placeholderMedida: string;
  guardando: boolean;
  resultado: ResultadoMover | null;
  onAtras?: () => void;
  onConfirmar: (opciones: OpcionesNuevaVariante) => void;
  onSumarAExistente: (varianteId: string) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  useEnterAvanza(form);

  const [filtro, setFiltro] = useState("");
  const [elegido, setElegido] = useState<ColorDestino | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [hexNuevo, setHexNuevo] = useState("#c8b49a");
  const [medida, setMedida] = useState("");

  // Si el servidor dijo "ese nombre de color ya existe", se elige solo.
  const [colorSugerido, setColorSugerido] = useState<string | null>(null);
  if (resultado?.colorExistente && colorSugerido !== resultado.colorExistente.id) {
    setColorSugerido(resultado.colorExistente.id);
    setElegido({ tipo: "existente", colorId: resultado.colorExistente.id });
  }

  const varianteDeColor = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of ocupados) if (v.colorId && !m.has(v.colorId)) m.set(v.colorId, v.id);
    return m;
  }, [ocupados]);

  const visibles = useMemo(() => {
    const f = normalizar(filtro);
    return f ? colores.filter((c) => normalizar(c.nombre).includes(f)) : colores;
  }, [colores, filtro]);

  const ocupadoPor = elegido?.tipo === "existente" ? varianteDeColor.get(elegido.colorId) : undefined;
  const nombreElegido =
    elegido?.tipo === "existente" ? colores.find((c) => c.id === elegido.colorId)?.nombre : null;

  const enviar = () => {
    if (!elegido) return;
    if (ocupadoPor) return onSumarAExistente(ocupadoPor);
    const color: ColorDestino =
      elegido.tipo === "nuevo" ? { tipo: "nuevo", nombre: nombreNuevo, hex: hexNuevo } : elegido;
    onConfirmar({ color, medida: medida.trim() || null });
  };

  const listo =
    !!elegido && (elegido.tipo !== "nuevo" || nombreNuevo.trim().length > 0);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <label className="mb-1 block text-sm font-medium text-ink-soft" htmlFor="filtro-color">
        Buscar color
      </label>
      <input
        id="filtro-color"
        type="search"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        // Enter aquí elige el único color que queda, en vez de saltar de campo.
        data-enter-propio
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (visibles.length === 1) setElegido({ tipo: "existente", colorId: visibles[0].id });
          }
        }}
        placeholder="Ej. plata, rosa…"
        className="h-12 w-full rounded border border-line bg-bg px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
      />

      <div
        role="radiogroup"
        aria-label="Color de la foto"
        className="mt-2 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded border border-line bg-bg p-1 sm:grid-cols-2"
      >
        {visibles.map((c) => {
          const activo = elegido?.tipo === "existente" && elegido.colorId === c.id;
          const ya = varianteDeColor.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => setElegido({ tipo: "existente", colorId: c.id })}
              className={`flex min-h-11 items-center gap-2 rounded px-2 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy ${
                activo ? "bg-heritage-navy text-white" : "text-ink hover:bg-surface-high"
              }`}
            >
              <ColorSwatch hex={c.hex} nombre={c.nombre} size="sm" />
              <span className="min-w-0 flex-1">{c.nombre}</span>
              {ya && (
                <span className={`shrink-0 text-sm ${activo ? "text-white" : "text-amber"}`}>ya está aquí</span>
              )}
            </button>
          );
        })}
        {visibles.length === 0 && (
          <p className="px-2 py-3 text-base text-ink-soft">Ningún color se llama así. Créalo abajo.</p>
        )}
      </div>

      {/* Color nuevo, en línea (no otra ventana encima: se pelearían el teclado). */}
      <div className="mt-3 rounded border border-line bg-bg p-3">
        <button
          type="button"
          role="radio"
          aria-checked={elegido?.tipo === "nuevo"}
          onClick={() => {
            setElegido({ tipo: "nuevo", nombre: nombreNuevo, hex: hexNuevo });
            if (!nombreNuevo && filtro.trim()) setNombreNuevo(filtro.trim());
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded text-base font-semibold text-ink-display focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
        >
          {elegido?.tipo === "nuevo" ? (
            <CheckCircle className="size-5 text-heritage-navy" weight="fill" aria-hidden />
          ) : (
            <Plus className="size-5" aria-hidden />
          )}
          No está en la lista: color nuevo
        </button>
        {elegido?.tipo === "nuevo" && (
          <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-soft">Nombre del color</span>
              <input
                type="text"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                maxLength={40}
                className="h-11 w-full rounded border border-line bg-surface px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-soft">Tono</span>
              <input
                type="color"
                value={hexNuevo}
                onChange={(e) => setHexNuevo(e.target.value)}
                className="h-11 w-16 cursor-pointer rounded border border-line bg-surface p-1"
              />
            </label>
          </div>
        )}
        {permitirSinColor && (
          <button
            type="button"
            role="radio"
            aria-checked={elegido?.tipo === "ninguno"}
            onClick={() => setElegido({ tipo: "ninguno" })}
            className="mt-1 flex min-h-11 items-center gap-2 rounded text-base text-ink-display focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
          >
            {elegido?.tipo === "ninguno" && (
              <CheckCircle className="size-5 text-heritage-navy" weight="fill" aria-hidden />
            )}
            Sin color (por ejemplo, una bolsita de varios colores)
          </button>
        )}
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-medium text-ink-soft">Medida (opcional)</span>
        <input
          type="text"
          value={medida}
          onChange={(e) => setMedida(e.target.value)}
          placeholder={placeholderMedida}
          maxLength={80}
          disabled={!!ocupadoPor}
          className="h-11 w-full rounded border border-line bg-bg px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:opacity-50"
        />
      </label>

      {ocupadoPor && (
        <p className="mt-3 rounded border border-amber/40 bg-amber/10 px-3 py-2 text-base text-ink">
          Este producto ya tiene <strong>{nombreElegido}</strong>. Si es la misma pieza, la foto se suma
          a ese color. Si es de <strong>otro tamaño</strong>, regresa y mándala al producto de esa medida.
        </p>
      )}

      {resultado?.error && (
        <ErrorModal>
          {resultado.error}
          {resultado.varianteExistenteId && (
            <button
              type="button"
              onClick={() => onSumarAExistente(resultado.varianteExistenteId!)}
              className="mt-2 flex min-h-11 items-center rounded border border-peligro/30 bg-surface px-3 text-base font-semibold text-ink-display focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
            >
              Sumar la foto a ese color
            </button>
          )}
        </ErrorModal>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {onAtras ? (
          <button
            type="button"
            onClick={onAtras}
            className="inline-flex min-h-11 items-center gap-2 rounded border border-line px-4 text-base font-semibold text-ink-display hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
          >
            <ArrowLeft className="size-5" aria-hidden />
            Atrás
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          data-atajo="guardar"
          disabled={!listo || guardando}
          className="inline-flex min-h-12 items-center rounded bg-heritage-navy px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-deep-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ocupadoPor ? `Sumar a ${nombreElegido}` : "Mover aquí"}
        </button>
      </div>
    </form>
  );
}

function BotonDestino({
  variante,
  deshabilitado,
  onClick,
}: {
  variante: VarianteDestino;
  deshabilitado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={deshabilitado}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded border border-line bg-bg px-3 py-2 text-base text-ink transition-colors hover:border-heritage-navy hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:opacity-50"
    >
      <ColorSwatch hex={variante.hex} nombre={variante.nombre} size="sm" />
      <span>{variante.nombre}</span>
    </button>
  );
}

function BotonNuevo({
  deshabilitado,
  onClick,
  children,
}: {
  deshabilitado: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={deshabilitado}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded border border-dashed border-line-strong bg-bg px-3 py-2 text-base font-semibold text-ink-display transition-colors hover:border-heritage-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:opacity-50"
    >
      <Plus className="size-5" aria-hidden />
      {children}
    </button>
  );
}
