"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowsLeftRight, ImageBroken, Plus, Star, Warning } from "@/components/ui/iconos";
import { ColorSwatch } from "@/components/ColorSwatch";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { eliminarFoto, moverFoto, moverFotoAVariante } from "@/app/admin/actions";
import { MoverFotoModal, type ColorCatalogo } from "@/components/admin/MoverFotoModal";

export type FotoGaleria = { id: string; url: string | null; alt: string | null };
export type VarianteGaleria = {
  id: string;
  /** Color · medida · SKU (`etiquetaVariante`): distingue tamaños y "sin color". */
  nombre: string;
  hex: string | null;
  colorId: string | null;
  /** Lo que hay que corregir en este color (`lib/admin/sospechosos.ts`), en texto. */
  avisos: string[];
  /** Ya ordenadas por `orden`: la primera es la portada de ese color. */
  fotos: FotoGaleria[];
};

/** Qué foto se está arrastrando y de qué variante salió. */
type Arrastre = { fotoId: string; origenId: string };
type Modal = Arrastre & { pasoInicial?: "destino" | "color" };

/**
 * Todas las fotos del producto, agrupadas por color y REASIGNABLES entre ellos.
 *
 * Está fuera de la ficha de cada variante —y no una por variante— porque las
 * zonas de drop son los OTROS colores: hay que verlos todos a la vez para poder
 * arrastrar de uno a otro. Existe por un problema de captura concreto: decenas
 * de variantes traen varios colores amontonados como fotos extra de una sola
 * (Gema llegó con 18), o el mismo artículo en OTRO TAMAÑO, que va en su propio
 * producto. Aquí la foto solo cambia de dueño, conservando su encuadre.
 *
 * El arrastre es un ATAJO, nunca la única vía: cada foto trae además un botón
 * "Mover…" que abre los mismos destinos en un modal, que es como se usa en la
 * tablet de la tienda y con teclado. Mismo patrón que `OrdenColores`.
 */
export function GaleriaFotos({
  telaId,
  telaNombre,
  placeholderMedida,
  variantes,
  colores,
}: {
  telaId: string;
  telaNombre: string;
  /** Ayuda del campo "Medida" según la categoría (se calcula en el servidor). */
  placeholderMedida: string;
  variantes: VarianteGaleria[];
  /** El catálogo de colores, para elegir el de un color nuevo. */
  colores: ColorCatalogo[];
}) {
  const router = useRouter();
  const arrastrada = useRef<Arrastre | null>(null);
  // Solo para el resaltado de la zona bajo el cursor: no decide nada.
  const [sobre, setSobre] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moviendo, startTransition] = useTransition();
  const [modal, setModal] = useState<Modal | null>(null);

  const total = variantes.reduce((n, v) => n + v.fotos.length, 0);
  const fotoDelModal = modal
    ? variantes.flatMap((v) => v.fotos).find((f) => f.id === modal.fotoId)
    : undefined;

  /** Corre un movimiento y refresca; el error se pinta sin tirar la página. */
  const correr = (accion: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await accion();
      if (res.error) return setError(res.error);
      router.refresh();
    });
  };

  /** Toma la foto arrastrada (y limpia el estado de arrastre) o `null`. */
  const soltada = (): Arrastre | null => {
    const arrastre = arrastrada.current;
    arrastrada.current = null;
    setSobre(null);
    return arrastre;
  };

  const propsZona = (clave: string, alSoltar: (a: Arrastre) => void) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setSobre(clave);
    },
    onDragLeave: (e: React.DragEvent) => {
      // Solo cuando el puntero sale de la zona ENTERA: al pasar de una
      // miniatura a otra el evento se dispara aunque sigas dentro.
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setSobre((actual) => (actual === clave ? null : actual));
      }
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const arrastre = soltada();
      if (arrastre) alSoltar(arrastre);
    },
  });

  const anillo = (clave: string) =>
    sobre === clave ? "border-heritage-navy ring-2 ring-heritage-navy" : "border-line";

  return (
    <div className="mb-6 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink-display">Fotos del producto ({total})</h3>
        <span className="shrink-0 text-sm text-ink-soft" aria-live="polite">
          {moviendo ? "Moviendo…" : ""}
        </span>
      </div>
      <p className="mb-4 text-base text-ink-soft">
        La primera foto de cada color es su portada. <strong>Arrastra</strong> una foto al color al que
        de verdad pertenece —o usa su botón <strong>Mover…</strong>, que hace lo mismo sin arrastrar—.
        La foto conserva su recorte y sus tamaños; solo cambia de color.
      </p>

      <div className="space-y-3">
        {variantes.map((v) => (
          <section
            key={v.id}
            // Destino de "Ver sus fotos" del recuadro "Para corregir".
            id={`fotos-${v.id}`}
            {...propsZona(v.id, (a) => {
              if (a.origenId === v.id) return; // ya estaba en este color
              correr(() => moverFotoAVariante(a.fotoId, v.id));
            })}
            className={`scroll-mt-24 rounded-xl border bg-bg p-3 transition-colors ${
              v.avisos.length ? "border-amber/50" : ""
            } ${anillo(v.id)}`}
          >
            <h4 className="mb-2 flex flex-wrap items-center gap-2 text-base text-ink-display">
              <ColorSwatch hex={v.hex} nombre={v.nombre} size="sm" />
              <span className="font-semibold">{v.nombre}</span>
              <span className="text-sm text-ink-soft">
                {v.fotos.length === 0
                  ? "sin fotos"
                  : `${v.fotos.length} ${v.fotos.length === 1 ? "foto" : "fotos"}`}
              </span>
            </h4>

            {v.avisos.length > 0 && (
              <ul className="mb-3 space-y-1 rounded border border-amber/40 bg-amber/10 px-3 py-2 text-base text-ink">
                {v.avisos.map((a) => (
                  <li key={a} className="flex items-start gap-2">
                    <Warning className="mt-1 size-4 shrink-0 text-amber" aria-hidden />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            )}

            {v.fotos.length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-4 text-base text-ink-soft">
                <ImageBroken className="size-5 shrink-0" aria-hidden />
                Sin fotos: este color sale con un marcador gris en el catálogo. Arrástrale una.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {v.fotos.map((f, idx, lista) => (
                  <li
                    key={f.id}
                    draggable
                    onDragStart={(e) => {
                      arrastrada.current = { fotoId: f.id, origenId: v.id };
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      arrastrada.current = null;
                      setSobre(null);
                    }}
                    // 160px: caben tres controles de 44px, y una foto repetida
                    // se distingue de otra de distinto tamaño a simple vista.
                    className="w-40 cursor-grab active:cursor-grabbing"
                  >
                    <div className="relative aspect-square w-40 overflow-hidden rounded border border-line bg-line/40">
                      {f.url && (
                        <Image src={f.url} alt={f.alt ?? telaNombre} fill sizes="160px" className="object-cover" />
                      )}
                      {idx === 0 && (
                        <span
                          className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-amber px-2 py-0.5 text-sm font-semibold text-white"
                          title="Foto principal"
                        >
                          <Star className="size-4" aria-hidden /> Portada
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <form action={moverFoto}>
                        <input type="hidden" name="foto_id" value={f.id} />
                        <input type="hidden" name="variante_id" value={v.id} />
                        <input type="hidden" name="tela_id" value={telaId} />
                        <input type="hidden" name="direccion" value="subir" />
                        <BotonIcono etiqueta="Mover antes" deshabilitado={idx === 0}>
                          <ArrowLeft className="size-5" aria-hidden />
                        </BotonIcono>
                      </form>
                      <form action={eliminarFoto}>
                        <input type="hidden" name="foto_id" value={f.id} />
                        <input type="hidden" name="tela_id" value={telaId} />
                        <ConfirmSubmit
                          label="Borrar"
                          pendingLabel="…"
                          size="xs"
                          mensaje="¿Eliminar esta foto? Se borra también del almacenamiento (salvo lo que otra foto siga usando) y no se puede deshacer."
                        />
                      </form>
                      <form action={moverFoto}>
                        <input type="hidden" name="foto_id" value={f.id} />
                        <input type="hidden" name="variante_id" value={v.id} />
                        <input type="hidden" name="tela_id" value={telaId} />
                        <input type="hidden" name="direccion" value="bajar" />
                        <BotonIcono etiqueta="Mover después" deshabilitado={idx === lista.length - 1}>
                          <ArrowRight className="size-5" aria-hidden />
                        </BotonIcono>
                      </form>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModal({ fotoId: f.id, origenId: v.id })}
                      className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded border border-line bg-surface text-base font-semibold text-ink-display transition-colors hover:border-heritage-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
                    >
                      <ArrowsLeftRight className="size-5" aria-hidden />
                      Mover…
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* Zonas SOLO de arrastre: el camino equivalente sin ratón es el botón
          "Mover…" de cada foto, que abre estos mismos destinos en el modal. */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div
          {...propsZona("nueva", (a) => setModal({ ...a, pasoInicial: "color" }))}
          className={`flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-4 text-base text-ink-soft transition-colors ${anillo(
            "nueva"
          )}`}
        >
          <Plus className="size-5 shrink-0" aria-hidden />
          Suelta aquí para darle su propio color
        </div>
        <div
          {...propsZona("otro", (a) => setModal(a))}
          className={`flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-4 text-base text-ink-soft transition-colors ${anillo(
            "otro"
          )}`}
        >
          <ArrowsLeftRight className="size-5 shrink-0" aria-hidden />
          Suelta aquí para mandarla a otro producto
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded border border-peligro/30 bg-peligro-suave px-3 py-2 text-base text-peligro">
          {error}
        </p>
      )}

      {modal && (
        <MoverFotoModal
          fotoId={modal.fotoId}
          fotoUrl={fotoDelModal?.url ?? null}
          telaId={telaId}
          telaNombre={telaNombre}
          placeholderMedida={placeholderMedida}
          variantesProducto={variantes.map((v) => ({ id: v.id, nombre: v.nombre, hex: v.hex, colorId: v.colorId }))}
          origenId={modal.origenId}
          colores={colores}
          pasoInicial={modal.pasoInicial}
          onCerrar={() => setModal(null)}
          onHecho={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** Botón de submit con solo icono para reordenar fotos dentro de su color. */
function BotonIcono({
  etiqueta,
  deshabilitado,
  children,
}: {
  etiqueta: string;
  deshabilitado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={deshabilitado}
      aria-label={etiqueta}
      title={etiqueta}
      className="inline-flex size-11 items-center justify-center rounded border border-line bg-surface text-ink-display transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
