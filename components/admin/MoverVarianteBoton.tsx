"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowsLeftRight } from "@/components/ui/iconos";
import { ModalAdmin, ErrorModal } from "@/components/admin/ModalAdmin";
import { BuscadorProducto, type ProductoEncontrado } from "@/components/admin/BuscadorProducto";
import { crearProductoYMoverVariante, moverVarianteAProducto, type ResultadoMover } from "@/app/admin/actions";

type Destino = { tipo: "existente"; producto: ProductoEncontrado } | { tipo: "nuevo"; nombre: string };

/**
 * "Mover a otro producto…": se lleva el color COMPLETO —código, precio,
 * existencia, fotos e historial de inventario— a otro producto. Para cuando un
 * artículo ya capturado quedó en el producto de otro tamaño. No copia ni borra
 * nada: solo cambia de dueño (`moverVarianteAProducto`).
 *
 * Pide confirmar antes de mover, porque lo que viaja es lo que la tienda ya
 * capturó; y al terminar ofrece abrir el producto de destino.
 */
export function MoverVarianteBoton({
  varianteId,
  telaId,
  etiqueta,
  fotos,
}: {
  varianteId: string;
  telaId: string;
  /** Color · medida · SKU, para que se sepa qué se mueve. */
  etiqueta: string;
  fotos: number;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [destino, setDestino] = useState<Destino | null>(null);
  const [resultado, setResultado] = useState<ResultadoMover | null>(null);
  const [hecho, setHecho] = useState<{ telaId: string; nombre: string } | null>(null);
  const [guardando, startTransition] = useTransition();

  const cerrar = () => {
    setAbierto(false);
    setDestino(null);
    setResultado(null);
    if (hecho) router.refresh();
    setHecho(null);
  };

  const mover = () => {
    if (!destino) return;
    setResultado(null);
    startTransition(async () => {
      const res =
        destino.tipo === "existente"
          ? await moverVarianteAProducto(varianteId, destino.producto.id)
          : await crearProductoYMoverVariante(varianteId, destino.nombre);
      if (res.error) return setResultado(res);
      const nuevoId = "telaId" in res && typeof res.telaId === "string" ? res.telaId : null;
      setHecho({
        telaId: destino.tipo === "existente" ? destino.producto.id : (nuevoId ?? ""),
        nombre: destino.tipo === "existente" ? destino.producto.nombre : destino.nombre,
      });
    });
  };

  const nombreDestino = destino?.tipo === "existente" ? destino.producto.nombre : destino?.nombre;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded border border-line bg-surface px-4 text-base font-semibold text-ink-display shadow-sm transition-colors hover:border-heritage-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
      >
        <ArrowsLeftRight className="size-5" aria-hidden />
        Mover a otro producto…
      </button>

      {abierto && (
        <ModalAdmin
          titulo="Mover este color a otro producto"
          onCerrar={cerrar}
          descripcion={
            <>
              Se lleva <strong>{etiqueta}</strong> con su código, precio, existencia y{" "}
              {fotos === 1 ? "su foto" : `sus ${fotos} fotos`}. No se borra nada.
            </>
          }
        >
          {hecho ? (
            <div>
              <p className="rounded border border-line bg-bg px-3 py-3 text-base text-ink" role="status">
                Listo: <strong>{etiqueta}</strong> ahora está en <strong>{hecho.nombre}</strong>.
              </p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {hecho.telaId && (
                  <Link
                    href={`/admin/tela/${hecho.telaId}#variante-${varianteId}`}
                    className="inline-flex min-h-12 items-center rounded border border-line px-4 text-base font-semibold text-ink-display hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
                  >
                    Abrir {hecho.nombre}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={cerrar}
                  className="inline-flex min-h-12 items-center rounded bg-heritage-navy px-6 text-base font-semibold text-white hover:bg-deep-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy focus-visible:ring-offset-2"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : destino ? (
            <div>
              <p className="text-base text-ink">
                {destino.tipo === "nuevo" ? (
                  <>
                    Se crea el producto <strong>{nombreDestino}</strong> (con la misma categoría que este) y{" "}
                    <strong>{etiqueta}</strong> pasa a ser su primer color.
                  </>
                ) : (
                  <>
                    <strong>{etiqueta}</strong> pasa a <strong>{nombreDestino}</strong>.
                  </>
                )}
              </p>
              {resultado?.error && <ErrorModal>{resultado.error}</ErrorModal>}
              <div className="mt-4 flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDestino(null);
                    setResultado(null);
                  }}
                  className="inline-flex min-h-12 items-center rounded border border-line px-4 text-base font-semibold text-ink-display hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
                >
                  Elegir otro producto
                </button>
                <button
                  type="button"
                  data-atajo="guardar"
                  disabled={guardando}
                  onClick={mover}
                  className="inline-flex min-h-12 items-center rounded bg-heritage-navy px-6 text-base font-semibold text-white hover:bg-deep-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {guardando ? "Moviendo…" : "Mover color"}
                </button>
              </div>
            </div>
          ) : (
            <BuscadorProducto
              excluirId={telaId}
              etiquetaCrear={(nombre) => `Crear producto “${nombre}” y mover este color ahí`}
              onElegir={(producto) => setDestino({ tipo: "existente", producto })}
              onCrear={(nombre) => setDestino({ tipo: "nuevo", nombre })}
            />
          )}
        </ModalAdmin>
      )}
    </>
  );
}
