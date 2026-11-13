import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

/**
 * Navegar SIN que la página salte hasta arriba.
 * ===========================================================================
 * `router.push(href, { scroll: false })` no basta en producción (Next 15.5).
 * Cuando la URL destino no tiene una precarga EXACTA, el router reutiliza la
 * de otra URL con la misma ruta y la marca "aliased"
 * (`router-reducer/prefetch-cache-utils.js`, solo fuera de desarrollo). Como
 * existe `app/loading.tsx`, esa navegación pasa por
 * `handleAliasedPrefetchEntry` (`aliased-prefetch-navigations.js`), que nunca
 * fija `shouldScroll`; `handle-mutable.js` lo toma como `true` y la página se
 * va al tope (de paso enseña el esqueleto de loading.tsx).
 *
 * Así brincaba "Ver más" (`?ver=`), el cambio de color de la ficha
 * (`?color=`), el carrusel al cruzar de color y los chips de la barra.
 *
 * El remedio: `router.prefetch(href)` corre SÍNCRONO, con tipo FULL
 * (`app-router-instance.js`), y deja en el caché una entrada con la URL
 * exacta. La navegación que sigue la encuentra y toma el camino normal, que sí
 * respeta `scroll: false`.
 *
 * Límites, para quien depure esto después:
 *  - En `pnpm dev` no se reproduce: ahí no hay alias ni prefetch. Se prueba
 *    con `pnpm build && pnpm start`.
 *  - Una URL SIN querystring (`/merceria` a secas) puede seguir cayendo en la
 *    entrada con que se sembró la página al cargar.
 *  - Borrar esto al pasar a `clientSegmentCache` o a Next 16, que reescriben
 *    el caché de precargas: volver a probar primero.
 */
export function prepararSinSalto(router: Pick<Router, "prefetch">, href: string): void {
  router.prefetch(href);
}

/** `push` (o `replace`) que conserva el scroll. Ver `prepararSinSalto`. */
export function navegarSinSalto(
  router: Pick<Router, "prefetch" | "push" | "replace">,
  href: string,
  { reemplazar = false }: { reemplazar?: boolean } = {}
): void {
  prepararSinSalto(router, href);
  if (reemplazar) router.replace(href, { scroll: false });
  else router.push(href, { scroll: false });
}
