import type { Metadata } from "next";
import Link from "next/link";
import { LinkSinSalto } from "@/components/LinkSinSalto";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { CheckCircle, SignOut, MagnifyingGlass, ShieldWarning } from "@/components/ui/iconos";
import { getSesionRevisor } from "@/lib/revisor-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicImageUrl } from "@/lib/supabase/storage";
import { TelaImage } from "@/components/TelaImage";
import { ColorSwatch } from "@/components/ColorSwatch";
import { RevisionNav } from "@/components/revision/RevisionNav";
import { logout } from "./actions";
import { agruparPorModelo, type CatalogoTela, type TelaAgrupada } from "@/lib/types";
import { contarAvance, filtroDesdeParams, productoPasaFiltro, type FiltroRevision } from "@/lib/cierre";

export const metadata: Metadata = {
  title: "Revisión de catálogo — Telas La Jalisciense",
  robots: { index: false, follow: false },
};

/**
 * Tope de productos por búsqueda, mismo motivo que `MAX_PRODUCTOS_BUSQUEDA`
 * en `app/admin/page.tsx`: el segundo `in(tela_id, …)` viaja en la URL.
 */
const MAX_PRODUCTOS_BUSQUEDA = 48;

/**
 * La vista `catalogo_telas` trae 30+ columnas por variante y con `select("*")`
 * esta pantalla bajaba ~650 KB (medido en agosto, 471 filas), que además se
 * vuelven a serializar en el flight RSC que viaja al celular del revisor. Se
 * piden solo las que alguien lee: la tarjeta (portada, nombre, categoría,
 * swatches), `agruparPorModelo` (`tela_slug`, `precio_metro`, `unidad_venta`)
 * y el avance de cierre de lib/cierre.ts (`revisado_en`, `precio_metro`,
 * `foto_principal`). Medido entonces: 650 KB → 342 KB. Si esta pantalla
 * empieza a leer otra columna, se agrega aquí o llega `undefined`.
 */
const COLUMNAS_REVISION = [
  "variante_id",
  "tela_id",
  "tela_slug",
  "tela_nombre",
  "categoria",
  "sku",
  "color_nombre",
  "color_hex",
  "precio_metro",
  "unidad_venta",
  "revisado_en",
  "foto_principal",
  "foto_principal_derivados",
].join(",");

/**
 * Cola de revisión: una tarjeta por producto, con el avance de sus variantes
 * (`variante.revisado_en`). Mismo patrón de búsqueda en dos lecturas que
 * `app/admin/page.tsx` — ver el comentario ahí para el porqué.
 */
export default async function RevisionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pendientes?: string; sinprecio?: string; sinfoto?: string }>;
}) {
  const { user, autorizado } = await getSesionRevisor();
  if (!user) redirect("/revision/login");
  if (!autorizado) return <NoAutorizado email={user.email ?? ""} />;

  const params = await searchParams;
  const termino = params.q?.trim() ?? "";
  const filtro = filtroDesdeParams(params);

  const supabase = createAdminClient();

  let idsRecortados = false;
  let query = supabase.from("catalogo_telas").select(COLUMNAS_REVISION);

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
    query = query.in("tela_id", ids.slice(0, MAX_PRODUCTOS_BUSQUEDA));
  }

  query = query
    .order("tela_nombre", { ascending: true })
    .order("color_nombre", { ascending: true });

  const { data, error } = await query;
  // `select` proyectado ⇒ las columnas que no pide esta pantalla llegan
  // `undefined`; ninguna se lee aquí, en `agruparPorModelo` ni en lib/cierre.ts.
  const variantes = (data ?? []) as unknown as CatalogoTela[];
  const productos = agruparPorModelo(variantes);

  // El avance se calcula sobre TODO lo que trajo la búsqueda, no sobre lo
  // que queda visible tras un chip: si se contara sobre la lista ya filtrada,
  // esconder lo revisado también borraría la evidencia de cuánto se ha
  // avanzado. "Lista" = revisada + con precio + con foto (lib/cierre.ts); las
  // otras cifras dicen cuál de las tres falta.
  const avance = contarAvance(variantes);

  const productosVisibles = productos.filter((p) => productoPasaFiltro(p.variantes, filtro));

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <RevisionNav email={user.email ?? ""} />

      {avance.total > 0 && (
        <div className="mb-5 space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <BarraAvance etiqueta="Listas para entregar" valor={avance.listas} total={avance.total} destacada />
          <BarraAvance etiqueta="Revisadas" valor={avance.revisadas} total={avance.total} />
          <BarraAvance etiqueta="Con precio" valor={avance.conPrecio} total={avance.total} />
          <BarraAvance etiqueta="Con foto" valor={avance.conFoto} total={avance.total} />
          <p className="text-sm text-ink-soft">
            Lista para entregar = revisada, con precio y con su foto.
          </p>
        </div>
      )}

      <form method="get" className="mb-3 flex gap-2" role="search">
        {filtro === "pendientes" && <input type="hidden" name="pendientes" value="1" />}
        {filtro === "sinprecio" && <input type="hidden" name="sinprecio" value="1" />}
        {filtro === "sinfoto" && <input type="hidden" name="sinfoto" value="1" />}
        <div className="relative flex-1">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={termino}
            placeholder="Buscar por tela, color o SKU…"
            aria-label="Buscar productos"
            className="h-12 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          />
        </div>
        <button
          type="submit"
          className="h-12 shrink-0 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink-display shadow-sm transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          Buscar
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip href={hrefConsulta(termino, "todos")} activo={filtro === "todos"}>
          Todos
        </Chip>
        <Chip href={hrefConsulta(termino, "pendientes")} activo={filtro === "pendientes"}>
          Sin revisar
        </Chip>
        <Chip href={hrefConsulta(termino, "sinprecio")} activo={filtro === "sinprecio"}>
          Sin precio
        </Chip>
        <Chip href={hrefConsulta(termino, "sinfoto")} activo={filtro === "sinfoto"}>
          Sin foto
        </Chip>
      </div>

      <p className="mb-4 text-xs text-ink/50">
        {productosVisibles.length}{" "}
        {productosVisibles.length === 1 ? "producto" : "productos"}
        {termino && ` en esta búsqueda`}.
        {idsRecortados &&
          ` Hay más resultados: se muestran los primeros ${MAX_PRODUCTOS_BUSQUEDA}, afina la búsqueda para verlos.`}
      </p>

      {error && (
        <div className="rounded-2xl border border-amber/30 bg-amber/5 p-5 text-sm text-ink/80">
          No se pudo leer el catálogo: {error.message}
        </div>
      )}

      {!error && productosVisibles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-10 text-center text-sm text-ink/50">
          {termino
            ? `Sin resultados para “${termino}”.`
            : filtro === "pendientes"
              ? "No queda nada pendiente de revisar."
              : filtro === "sinprecio"
                ? "Todos los colores tienen precio."
                : filtro === "sinfoto"
                  ? "Todos los colores tienen foto."
                  : "Aún no hay productos en el catálogo."}
        </div>
      )}

      <ul className="space-y-3">
        {productosVisibles.map((tela) => (
          <TarjetaRevision key={tela.tela_id} tela={tela} />
        ))}
      </ul>
    </main>
  );
}

function hrefConsulta(termino: string, filtro: FiltroRevision): string {
  const params = new URLSearchParams();
  if (termino) params.set("q", termino);
  if (filtro === "pendientes") params.set("pendientes", "1");
  if (filtro === "sinprecio") params.set("sinprecio", "1");
  if (filtro === "sinfoto") params.set("sinfoto", "1");
  const qs = params.toString();
  return qs ? `/revision?${qs}` : "/revision";
}

/** Una cifra del avance con su barra. Texto ≥14px y la cifra en palabras. */
function BarraAvance({
  etiqueta,
  valor,
  total,
  destacada = false,
}: {
  etiqueta: string;
  valor: number;
  total: number;
  destacada?: boolean;
}) {
  const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
        <span className={destacada ? "font-semibold text-ink-display" : "font-medium text-ink-display"}>
          {etiqueta}
        </span>
        <span className="font-semibold text-amber">
          {valor} de {total} variantes ({porcentaje}%)
        </span>
      </div>
      <div
        className={`w-full overflow-hidden rounded-full bg-line/50 ${destacada ? "h-3" : "h-2"}`}
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={valor}
      >
        <div
          className={`h-full rounded-full transition-[width] ${destacada ? "bg-success" : "bg-amber"}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}

function Chip({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: ReactNode;
}) {
  return (
    <LinkSinSalto
      href={href}
      aria-current={activo ? "true" : undefined}
      className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded px-4 text-sm font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy ${
        activo
          ? "bg-heritage-navy text-white shadow-sm"
          : "border border-line bg-surface text-ink-display hover:bg-surface-high"
      }`}
    >
      {children}
    </LinkSinSalto>
  );
}

/**
 * Una tarjeta por producto: portada, nombre, categoría, la fila de swatches
 * (con palomita verde encima del color ya revisado) y el avance a la
 * derecha. La tarjeta ENTERA es el enlace al detalle — a diferencia de
 * `/admin`, aquí no hay deep-link por swatch: revisar es secuencial, entra
 * al producto y ahí se ve cada variante.
 */
function TarjetaRevision({ tela }: { tela: TelaAgrupada }) {
  const portada = tela.variantes[0];
  const total = tela.variantes.length;
  const revisadas = tela.variantes.filter((v) => v.revisado_en != null).length;
  const completo = total > 0 && revisadas === total;

  return (
    <li className="rounded-2xl border border-line bg-surface shadow-sm transition-colors hover:border-amber/40 hover:bg-surface-high">
      <Link
        href={`/revision/producto/${tela.tela_id}`}
        className="flex items-center gap-3 rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
      >
        <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-line">
          <TelaImage
            src={publicImageUrl(portada?.foto_principal)}
            derivados={portada?.foto_principal_derivados}
            sizes="72px"
            alt={
              portada?.color_nombre
                ? `${tela.tela_nombre} ${portada.color_nombre}`
                : tela.tela_nombre
            }
            aspecto="cuadrado"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink-display">{tela.tela_nombre}</p>
          <span
            className={
              tela.categoria
                ? "mt-1 inline-block rounded-full border border-line bg-bg px-2 py-0.5 text-xs text-ink/70"
                : "mt-1 inline-block rounded-full border border-dashed border-line px-2 py-0.5 text-xs text-ink/40"
            }
          >
            {tela.categoria ?? "Sin categoría"}
          </span>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {tela.variantes.map((v) => (
              <span key={v.variante_id} className="relative inline-flex">
                <ColorSwatch hex={v.color_hex} nombre={v.color_nombre} size="sm" />
                {v.revisado_en != null && (
                  <CheckCircle
                    className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-surface text-success"
                    aria-hidden
                  />
                )}
              </span>
            ))}
          </div>
        </div>

        <span
          className={
            completo
              ? "shrink-0 whitespace-nowrap rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
              : "shrink-0 whitespace-nowrap rounded-full bg-amber/10 px-2.5 py-1 text-xs font-semibold text-amber"
          }
        >
          {completo ? "✓ Completo" : `${revisadas} de ${total}`}
        </span>
      </Link>
    </li>
  );
}

/** Sesión válida pero correo fuera de REVISOR_EMAILS (ni ADMIN_EMAILS). */
function NoAutorizado({ email }: { email: string }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber/10 text-amber">
        <ShieldWarning className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="font-display text-2xl text-ink-display">Cuenta sin permisos</h1>
      <p className="mt-2 text-sm text-ink/60">
        La cuenta <strong>{email}</strong> no está en la lista de revisores (
        <code className="rounded bg-line/60 px-1">REVISOR_EMAILS</code>).
      </p>
      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-medium text-ink-display shadow-sm transition-colors hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
        >
          <SignOut className="h-4 w-4" aria-hidden />
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
