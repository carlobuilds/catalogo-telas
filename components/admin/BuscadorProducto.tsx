"use client";

import { useEffect, useState } from "react";
import { CircleNotch, MagnifyingGlass, Plus } from "@/components/ui/iconos";
import { buscarProductos } from "@/app/admin/actions";

export type ProductoEncontrado = { id: string; nombre: string; categoria: string | null };

/** Espera antes de buscar mientras se teclea. */
const DEBOUNCE_MS = 300;

/**
 * Buscar un producto de destino por nombre —o crearlo si no existe—. Lo usan
 * "Mover esta foto" y "Mover este color": los dos necesitan elegir OTRO
 * producto, que no está en pantalla.
 */
export function BuscadorProducto({
  excluirId,
  deshabilitado,
  etiquetaCrear,
  onElegir,
  onCrear,
}: {
  /** El producto actual: no se ofrece como "otro". */
  excluirId: string;
  deshabilitado?: boolean;
  /** Texto del botón de alta, con el nombre tecleado. */
  etiquetaCrear: (nombre: string) => string;
  onElegir: (producto: ProductoEncontrado) => void;
  onCrear: (nombre: string) => void;
}) {
  const [termino, setTermino] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ProductoEncontrado[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce: un setTimeout cancelado en el cleanup basta; el efecto ya se
  // re-dispara con cada tecla.
  useEffect(() => {
    const texto = termino.trim();
    if (texto.length < 2) {
      setResultados(null);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const t = setTimeout(async () => {
      const res = await buscarProductos(texto);
      setResultados(res.productos.filter((p) => p.id !== excluirId));
      setError(res.error ?? null);
      setBuscando(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [termino, excluirId]);

  const nombre = termino.trim();
  const sinResultados = resultados !== null && resultados.length === 0 && !buscando && nombre.length >= 2;

  return (
    <div>
      <div className="relative">
        <MagnifyingGlass
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <input
          type="search"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar producto por nombre…"
          aria-label="Buscar producto de destino"
          className="h-12 w-full rounded border border-line bg-bg pl-10 pr-10 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
        />
        {buscando && (
          <CircleNotch
            className="absolute right-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-ink-soft"
            aria-hidden
          />
        )}
      </div>

      {resultados && resultados.length > 0 && (
        <ul className="mt-3 space-y-1">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={deshabilitado}
                onClick={() => onElegir(p)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded border border-line bg-bg px-3 py-2 text-left text-base text-ink transition-colors hover:border-heritage-navy hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:opacity-50"
              >
                <span>{p.nombre}</span>
                <span className="shrink-0 text-sm text-ink-soft">{p.categoria ?? "Sin categoría"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {sinResultados && (
        <div className="mt-3">
          <p className="mb-2 text-base text-ink-soft">Ningún producto se llama así.</p>
          <button
            type="button"
            disabled={deshabilitado}
            onClick={() => onCrear(nombre)}
            className="inline-flex min-h-11 items-center gap-2 rounded border border-dashed border-line-strong bg-bg px-3 py-2 text-left text-base font-semibold text-ink-display transition-colors hover:border-heritage-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy disabled:opacity-50"
          >
            <Plus className="size-5 shrink-0" aria-hidden />
            {etiquetaCrear(nombre)}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-base text-peligro">{error}</p>}
    </div>
  );
}
