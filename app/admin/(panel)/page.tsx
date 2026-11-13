import type { Metadata } from "next";
import Link from "next/link";
import { Image as ImageIcon, ImageBroken, PencilSimple, MagnifyingGlass, Warning, X } from "@/components/ui/iconos";
import { exigirAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicImageUrl } from "@/lib/supabase/storage";
import { TelaImage } from "@/components/TelaImage";
import { ColorSwatch } from "@/components/ColorSwatch";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { contarFotosPorVariante } from "@/lib/fotos";
import { agruparPorModelo, type CatalogoTela, type TelaAgrupada } from "@/lib/types";
import { motivosPorVariante, politicaDeProducto, resumenDeMotivos } from "@/lib/admin/sospechosos";

export const metadata: Metadata = {
  title: "Admin — Telas La Jalisciense",
  robots: { index: false, follow: false },
};

/** Cuántos swatches caben antes de resumir el resto en un "+N". */
const MAX_SWATCHES = 12;

/**
 * Tope de productos por búsqueda. Acota la URL del `in(tela_id, …)` de la
 * segunda lectura; una búsqueda que devuelve más de esto hay que afinarla, no
 * recorrerla (el grid público pagina de 48 por lo mismo).
 */
const MAX_PRODUCTOS_BUSQUEDA = 48;

/** Tope de filas por respuesta de PostgREST: más allá de esto, se pagina. */
const FILAS_POR_LECTURA = 1000;

type Pagina<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/**
 * Lee TODAS las filas de una consulta de mil en mil. Sin esto, PostgREST corta
 * en 1000 en silencio: el conteo de fotos (y con él la marca de "fotos de
 * más") saldría mal en cuanto el catálogo pase de mil fotos. La consulta debe
 * traer un `order` que no empate, o dos páginas se enciman.
 */
async function leerTodo<T>(
  pagina: (desde: number, hasta: number) => Pagina<T>
): Promise<{ data: T[]; error: { message: string } | null }> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += FILAS_POR_LECTURA) {
    const { data, error } = await pagina(desde, desde + FILAS_POR_LECTURA - 1);
    if (error) return { data: filas, error };
    filas.push(...(data ?? []));
    if ((data?.length ?? 0) < FILAS_POR_LECTURA) return { data: filas, error: null };
  }
}

/**
 * Panel de administración: una tarjeta POR PRODUCTO (no por variante). La vista
 * trae una fila por color, así que un modelo de 8 colores llenaba ocho tarjetas
 * seguidas con el mismo nombre; `agruparPorModelo` —el mismo agrupador que usa
 * el grid público— las colapsa en una sola con sus colores como swatches.
 *
 * La CARD COMPLETA abre el editor (/admin/tela/[id]: valores, variantes, fotos)
 * y cada swatch abre ESE color dentro del editor. Precio y stock ya no se
 * capturan aquí: con ocho colores por tarjeta no cabe un formulario por color,
 * y el deep-link del swatch deja el campo a un toque de distancia.
 *
 * Lee la vista con el cliente service_role SIN caché: el admin siempre ve
 * la verdad de la BD (sin precios demo). Al guardar, `revalidateTag` refresca
 * el sitio público al instante.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; buscar?: string; revisar?: string }>;
}) {
  await exigirAdmin();

  // `?buscar=1` lo pone F3 desde otra pantalla: llega con el cursor en el buscador.
  // `?revisar=1` deja solo los productos "para corregir" (lib/admin/sospechosos.ts).
  const { q, buscar, revisar } = await searchParams;
  const termino = q?.trim() ?? "";
  const soloParaCorregir = revisar === "1";

  const supabase = createAdminClient();

  // Buscar por PRODUCTO, no por fila. La vista da una fila por color, así que
  // filtrar por `color_nombre` traería solo los colores que casan: la tarjeta
  // agrupada saldría con 1 de 8 swatches y contando las fotos de ese color, y
  // un producto con 20 fotos diría "1 foto". Se resuelve como el catálogo
  // público (`paginaCatalogoCached`): una lectura barata para saber QUÉ
  // productos casan y otra para traer sus filas completas.
  //
  // El tope existe porque el segundo `in(...)` viaja en la URL y cientos de
  // UUIDs la revientan (mismo motivo por el que el grid público pagina de 48).
  let idsRecortados = false;
  let idsBuscados: string[] | null = null;

  if (termino) {
    const patron = `%${termino.replace(/[,()"\\]/g, " ")}%`;
    const filtro = `tela_nombre.ilike.${patron},color_nombre.ilike.${patron},sku.ilike.${patron}`;

    const { data: coincidencias } = await supabase
      .from("catalogo_telas")
      .select("tela_id, tela_nombre")
      .or(filtro)
      .order("tela_nombre", { ascending: true });

    const ids = [...new Set((coincidencias ?? []).map((c) => c.tela_id as string))];
    idsRecortados = ids.length > MAX_PRODUCTOS_BUSQUEDA;
    idsBuscados = ids.slice(0, MAX_PRODUCTOS_BUSQUEDA);
  }

  // `variante_id` desempata el orden: sin él, dos páginas de mil podrían
  // encimarse (muchas filas comparten nombre de tela y de color).
  const paginaVista = (desde: number, hasta: number) => {
    let consulta = supabase.from("catalogo_telas").select("*");
    if (idsBuscados) consulta = consulta.in("tela_id", idsBuscados);
    return consulta
      .order("tela_nombre", { ascending: true })
      .order("color_nombre", { ascending: true })
      .order("variante_id", { ascending: true })
      .range(desde, hasta);
  };

  // El conteo de fotos NO está en la vista (colapsa las N fotos de la variante
  // en `foto_principal`), así que va en una lectura aparte que se agrupa en
  // memoria. Se piden TODAS las filas, sin filtrar por las variantes visibles:
  // un `in(...)` con cientos de UUIDs revienta el largo de la URL de PostgREST.
  const [{ data, error }, { data: fotos }] = await Promise.all([
    leerTodo<CatalogoTela>(paginaVista),
    leerTodo<{ variante_id: string }>((desde, hasta) =>
      supabase.from("foto").select("variante_id").order("id", { ascending: true }).range(desde, hasta)
    ),
  ]);
  const variantes = data;
  const fotosPorVariante = contarFotosPorVariante(fotos);
  // La query ya viene ordenada por nombre de tela; el agrupador respeta ese
  // orden de llegada, así que la lista sale alfabética sin volver a ordenar.
  const todos = agruparPorModelo(variantes).map((tela) => {
    const motivos = motivosPorVariante(
      tela.variantes.map((v) => ({
        id: v.variante_id,
        colorClave: v.color_slug ?? null,
        fotos: fotosPorVariante.get(v.variante_id) ?? 0,
        nota: v.nota,
      })),
      politicaDeProducto(tela.variantes[0]?.categoria_slug)
    );
    return { tela, avisos: resumenDeMotivos(motivos) };
  });
  const paraCorregir = todos.filter((p) => p.avisos.length > 0).length;
  const productos = soloParaCorregir ? todos.filter((p) => p.avisos.length > 0) : todos;
  const coloresVisibles = productos.reduce((n, p) => n + p.tela.variantes.length, 0);

  // El chip conserva la búsqueda: "flor" + "para corregir" se combinan.
  const hrefChip = (() => {
    const qs = new URLSearchParams();
    if (termino) qs.set("q", termino);
    if (!soloParaCorregir) qs.set("revisar", "1");
    const t = qs.toString();
    return t ? `/admin?${t}` : "/admin";
  })();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <EncabezadoPagina titulo="Artículos" descripcion="Todo lo que se vende en la tienda: telas y mercería." />

      {/* Búsqueda (GET → estado compartible en la URL, igual que el sitio público) */}
      <form method="get" className="mb-3 flex max-w-xl gap-2" role="search">
        {soloParaCorregir && <input type="hidden" name="revisar" value="1" />}
        <div className="relative flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 z-10 size-5 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            name="q"
            defaultValue={termino}
            autoFocus={buscar === "1"}
            data-atajo="buscar"
            placeholder="Nombre, color o código"
            aria-label="Buscar artículos por nombre, color o código"
            className="h-12 w-full rounded border border-line bg-surface-container-lowest pl-10 pr-3 text-base text-ink-text placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-12 items-center gap-2 rounded border border-line bg-surface-container-lowest px-4 text-base font-semibold text-ink-display shadow-sm transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
        >
          Buscar
          <kbd className="hidden rounded border border-line px-1.5 font-sans text-sm text-ink-soft pointer-fine:inline">F3</kbd>
        </button>
      </form>

      {/* "Para corregir": colores con fotos de más, notas de revisión, color
          repetido o sin color. Se calcula al vuelo; no escribe nada. */}
      {(paraCorregir > 0 || soloParaCorregir) && (
        <div className="mb-4">
          <Link
            href={hrefChip}
            aria-pressed={soloParaCorregir}
            className={
              soloParaCorregir
                ? "inline-flex min-h-11 items-center gap-2 rounded bg-heritage-navy px-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-deep-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy focus-visible:ring-offset-2"
                : "inline-flex min-h-11 items-center gap-2 rounded border border-amber/50 bg-amber/10 px-4 text-base font-semibold text-amber transition-colors hover:bg-amber/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
            }
          >
            <Warning className="size-5" aria-hidden />
            Para corregir ({paraCorregir})
            {soloParaCorregir && <X className="size-4" aria-hidden />}
          </Link>
        </div>
      )}

      <p className="mb-6 text-base text-ink-soft">
        <strong>Toca la tarjeta</strong> para abrir el editor completo (precio,
        stock, fotos, colores, categoría), o toca un <strong>color</strong> para
        ir directo a ese color dentro del editor.
        {productos.length > 0 && (
          <>
            {" "}
            <span className="font-semibold text-ink-display">
              {productos.length}{" "}
              {productos.length === 1 ? "producto" : "productos"} ·{" "}
              {coloresVisibles} {coloresVisibles === 1 ? "color" : "colores"}
              {soloParaCorregir && " para corregir"}
              {termino && " en esta búsqueda"}.
              {idsRecortados &&
                ` Hay más resultados: se muestran los primeros ${MAX_PRODUCTOS_BUSQUEDA}, afina la búsqueda para verlos.`}
            </span>
          </>
        )}
      </p>

      {error && (
        <div className="rounded-2xl border border-amber/30 bg-amber/5 p-5 text-base text-ink">
          No se pudo leer el catálogo: {error.message}
        </div>
      )}

      {!error && productos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-10 text-center text-base text-ink-soft">
          {soloParaCorregir
            ? "Nada para corregir aquí. ¡Todo en orden!"
            : termino
              ? `Sin resultados para “${termino}”.`
              : "Aún no hay productos en el catálogo. Corre la ingesta (ver README)."}
        </div>
      )}

      <ul className="space-y-3">
        {productos.map(({ tela, avisos }) => (
          <TarjetaProducto
            key={tela.tela_id}
            tela={tela}
            avisos={avisos}
            fotos={tela.variantes.reduce(
              (total, v) => total + (fotosPorVariante.get(v.variante_id) ?? 0),
              0
            )}
          />
        ))}
      </ul>
    </main>
  );
}

/**
 * Un producto en la lista: portada, nombre, sus dos datos de catalogación
 * —categoría y cuántas fotos tiene EN TOTAL— y la fila de colores.
 *
 * La card entera es un enlace al editor MENOS los swatches, que apuntan cada
 * uno a su propia variante. Se pinta un swatch por VARIANTE y no por color
 * único (como sí hace `ProductCard` en la vitrina): aquí el punto no es
 * decorativo sino un destino, y deduplicar dejaría sin enlace a dos SKUs que
 * comparten color y sin ningún punto a las variantes sin color —justo las de
 * mercería—.
 */
function TarjetaProducto({
  tela,
  fotos,
  avisos,
}: {
  tela: TelaAgrupada;
  fotos: number;
  /** Resumen de lo que hay que corregir (vacío = nada). */
  avisos: string[];
}) {
  const portada = tela.variantes[0];
  const unicaVariante = tela.variantes.length === 1 ? portada : null;
  const visibles = tela.variantes.slice(0, MAX_SWATCHES);
  const ocultos = tela.variantes.length - visibles.length;

  return (
    <li
      /* `relative` ancla el stretched link del nombre (su ::after cubre
         toda la card). `group` deja que el lápiz decorativo reaccione al
         hover de la card completa, no solo al del enlace. */
      className="group relative flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors hover:border-amber/40 hover:bg-surface-high"
    >
      <div className="w-14 shrink-0 overflow-hidden rounded-lg border border-line">
        <TelaImage
          src={publicImageUrl(portada?.foto_principal)}
          derivados={portada?.foto_principal_derivados}
          sizes="56px"
          alt={
            portada?.color_nombre
              ? `${tela.tela_nombre} ${portada.color_nombre}`
              : tela.tela_nombre
          }
          aspecto="cuadrado"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-semibold leading-tight text-ink">
          {/* Stretched link: enlace REAL sobre el nombre (así tiene texto
              accesible y se puede abrir en otra pestaña) cuyo ::after se
              estira sobre la card entera. */}
          <Link
            href={`/admin/tela/${tela.tela_id}`}
            title="Editar producto (precio, stock, colores y fotos)"
            className="truncate rounded after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          >
            {tela.tela_nombre}
          </Link>
          <PencilSimple
            className="size-4 shrink-0 text-ink-soft transition-colors group-hover:text-amber"
            aria-hidden
          />
        </p>

        {/* Con un solo color la fila de swatches no dice nada que el nombre no
            diga ya; en su lugar se muestra el color y el SKU, que es lo que
            identifica una bolsita de mercería. */}
        {unicaVariante && (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-soft">
            {unicaVariante.color_hex && (
              <ColorSwatch
                hex={unicaVariante.color_hex}
                nombre={unicaVariante.color_nombre}
                size="sm"
              />
            )}
            <span className="truncate">
              {unicaVariante.color_nombre ?? "Sin color"}
              {unicaVariante.sku && ` · ${unicaVariante.sku}`}
            </span>
          </p>
        )}

        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
          <span
            className={
              tela.categoria
                ? "rounded border border-line bg-bg px-2 py-0.5 text-ink-soft"
                : "rounded border border-dashed border-line px-2 py-0.5 text-ink-soft"
            }
          >
            {tela.categoria ?? "Sin categoría"}
          </span>
          {/* Cero fotos se marca en ámbar: es un producto invisible
              en el catálogo, no un dato de menos. */}
          <span
            className={
              fotos === 0
                ? "inline-flex items-center gap-1 rounded bg-amber/10 px-2 py-0.5 font-semibold text-amber"
                : "inline-flex items-center gap-1 rounded px-2 py-0.5 text-ink-soft"
            }
          >
            {fotos === 0 ? (
              <ImageBroken className="size-4" aria-hidden />
            ) : (
              <ImageIcon className="size-4" aria-hidden />
            )}
            {fotos === 0 ? "Sin fotos" : `${fotos} ${fotos === 1 ? "foto" : "fotos"}`}
          </span>
          {!unicaVariante && (
            <span className="rounded px-2 py-0.5 text-ink-soft">
              {tela.variantes.length} colores
            </span>
          )}
        </p>

        {/* Lo que hay que corregir, en mostaza (información, no acción). El
            detalle por color está dentro del editor. */}
        {avisos.length > 0 && (
          <p className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-amber">
            <Warning className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Para corregir: {avisos.join(" · ")}</span>
          </p>
        )}

        {/* z-10 levanta los swatches por encima del ::after del enlace: sin
            esto, tocar un color abriría el editor en la primera variante. */}
        {!unicaVariante && (
          <div className="relative z-10 mt-1 flex flex-wrap items-center">
            {visibles.map((v) => {
              const etiqueta =
                v.color_nombre ?? (v.sku ? `SKU ${v.sku}` : "Sin color");
              return (
                <Link
                  key={v.variante_id}
                  href={`/admin/tela/${tela.tela_id}#variante-${v.variante_id}`}
                  title={`Editar ${etiqueta}`}
                  aria-label={`Editar ${etiqueta}`}
                  /* El punto mide 20px; el enlace, 44px: es lo que se toca en la tablet. */
                  className="inline-flex size-11 items-center justify-center rounded transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
                >
                  <ColorSwatch hex={v.color_hex} nombre={etiqueta} size="sm" />
                </Link>
              );
            })}
            {ocultos > 0 && (
              <Link
                href={`/admin/tela/${tela.tela_id}`}
                className="inline-flex min-h-11 items-center rounded px-2 text-sm font-semibold text-ink-soft hover:text-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
              >
                +{ocultos}
              </Link>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
