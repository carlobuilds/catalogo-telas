/**
 * Skeleton mientras el servidor arma la página (la primera visita tras
 * expirar el caché de 60s puede tardar ~2s). Replica la silueta del grid
 * —card cuadrada, `rounded` de 4px, mismo padding que `ProductCard`— para
 * que el cambio a contenido real no "brinque".
 */
export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <span className="sr-only">Cargando el catálogo…</span>
      <div className="mb-6 h-12 max-w-xl animate-pulse rounded bg-line/50" />
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded border border-outline-variant/30 bg-surface-container-lowest p-3 shadow-sm sm:p-4"
          >
            <div className="aspect-square animate-pulse rounded bg-line/50" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-line/50" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-line/50" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-line/50" />
          </div>
        ))}
      </div>
    </main>
  );
}
