"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { type Filtros, FILTROS_VACIOS, aQuerystring } from "@/lib/filtros";
import { type Catalogo, CATALOGOS, rutaDeCatalogo } from "@/lib/catalogos";
import { resaltar } from "@/lib/busqueda/resaltar";
import { ColorSwatch } from "@/components/ColorSwatch";
import type { RespuestaSugerencias } from "@/app/api/sugerencias/route";

/**
 * Buscador con sugerencias mientras se escribe (combobox ARIA).
 * ===========================================================================
 * El grid YA NO cambia con cada tecla: escribir solo abre la lista de
 * sugerencias (secciones, categorías, colores y productos, de
 * `/api/sugerencias`, que busca en el índice del servidor). Los resultados
 * completos llegan con Enter —o con la primera opción, "Buscar…", para quien
 * no encuentra la tecla— como `?q=` en el catálogo actual, conservando la
 * sección.
 *
 * Teclado: ↑/↓ recorren, Enter elige, Esc cierra (y un segundo Esc borra).
 * El foco nunca sale del input: la opción activa se anuncia con
 * `aria-activedescendant`, que es como lo espera un lector de pantalla.
 */

const ESPERA_MS = 120;

const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

type Opcion = {
  id: string;
  href: string;
  grupo: "buscar" | "secciones" | "categorias" | "colores" | "productos" | "otro";
};

function rutaCon(base: string, f: Filtros): string {
  const qs = aQuerystring(f);
  return qs ? `${base}?${qs}` : base;
}

/** El texto con lo que coincidió en negritas. */
function Resaltado({ texto, consulta }: { texto: string; consulta: string }) {
  return (
    <>
      {resaltar(texto, consulta).map((t, i) =>
        t.marcado ? (
          <strong key={i} className="font-bold text-ink-display">
            {t.texto}
          </strong>
        ) : (
          <span key={i}>{t.texto}</span>
        )
      )}
    </>
  );
}

export function SearchBar({
  catalogo,
  filtros,
  placeholder = "Busca por nombre, color o código",
}: {
  catalogo: Catalogo;
  filtros: Filtros;
  placeholder?: string;
}) {
  const router = useRouter();
  const idBase = useId();
  const idLista = `${idBase}-lista`;
  const contenedor = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const [valor, setValor] = useState(filtros.q);
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<RespuestaSugerencias | null>(null);
  const [activo, setActivo] = useState(-1);

  // Si la búsqueda cambia por fuera (Limpiar, atrás, un link), el input la
  // sigue. Es el patrón de React para ajustar estado a una prop, sin efecto.
  const [qPrevio, setQPrevio] = useState(filtros.q);
  if (qPrevio !== filtros.q) {
    setQPrevio(filtros.q);
    setValor(filtros.q);
  }

  const consulta = valor.trim();
  const base = rutaDeCatalogo(catalogo);

  // Sugerencias: solo mientras la lista está abierta (quien llega con `?q=`
  // en la URL no dispara una consulta que nadie va a ver). La anterior se
  // cancela: con red lenta, una respuesta vieja no debe pisar a la nueva.
  useEffect(() => {
    if (!abierto || !consulta) return;
    const control = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/sugerencias?${new URLSearchParams({ q: consulta, catalogo })}`, {
          signal: control.signal,
        });
        if (!r.ok) return;
        setDatos((await r.json()) as RespuestaSugerencias);
        setActivo(-1);
      } catch {
        // Cancelada o sin red: se quedan las sugerencias anteriores.
      }
    }, ESPERA_MS);
    return () => {
      clearTimeout(t);
      control.abort();
    };
  }, [abierto, consulta, catalogo]);

  // Tocar fuera cierra la lista.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  // Las sugerencias que se muestran son las de ESTA consulta, o las de la
  // anterior mientras llega la nueva (sin parpadeo). Sin texto, nada.
  const vigentes = consulta && datos ? datos : null;
  const hrefBuscar = rutaCon(base, { ...FILTROS_VACIOS, seccion: filtros.seccion, q: consulta });
  const sinNada =
    vigentes &&
    vigentes.total === 0 &&
    vigentes.secciones.length + vigentes.categorias.length + vigentes.colores.length === 0;

  const opciones: Opcion[] = [];
  if (vigentes) {
    if (!sinNada) opciones.push({ id: `${idBase}-buscar`, href: hrefBuscar, grupo: "buscar" });
    vigentes.secciones.forEach((s) =>
      opciones.push({
        id: `${idBase}-sec-${s.slug}`,
        href: rutaCon(base, { ...FILTROS_VACIOS, seccion: s.slug }),
        grupo: "secciones",
      })
    );
    vigentes.categorias.forEach((c) =>
      opciones.push({
        id: `${idBase}-cat-${c.slug}`,
        href: rutaCon(base, { ...FILTROS_VACIOS, seccion: c.seccion, categorias: [c.slug] }),
        grupo: "categorias",
      })
    );
    vigentes.colores.forEach((c) =>
      opciones.push({
        id: `${idBase}-color-${c.slug}`,
        href: rutaCon(base, { ...FILTROS_VACIOS, colores: [c.slug] }),
        grupo: "colores",
      })
    );
    vigentes.productos.forEach((p) =>
      opciones.push({ id: `${idBase}-prod-${p.slug}`, href: `/tela/${p.slug}`, grupo: "productos" })
    );
    if (vigentes.enOtroCatalogo.total > 0 && (sinNada || vigentes.total === 0)) {
      opciones.push({
        id: `${idBase}-otro`,
        href: rutaCon(rutaDeCatalogo(vigentes.enOtroCatalogo.catalogo), { ...FILTROS_VACIOS, q: consulta }),
        grupo: "otro",
      });
    }
  }

  const visible = abierto && vigentes != null;
  const idActivo = activo >= 0 ? opciones[activo]?.id : undefined;

  /**
   * Navega y cierra. Un atajo (sección, categoría, color) NO es una búsqueda:
   * el campo se vacía para que no parezca que "pedreia" sigue aplicado.
   */
  const ir = (href: string, grupo: Opcion["grupo"] = "buscar") => {
    setAbierto(false);
    setActivo(-1);
    if (grupo !== "buscar" && grupo !== "otro") setValor("");
    input.current?.blur();
    router.push(href);
  };

  const buscar = () => {
    // Enter con el campo vacío quita la búsqueda y deja el resto de filtros.
    ir(consulta ? hrefBuscar : rutaCon(base, { ...filtros, q: "" }));
  };

  const limpiar = () => {
    setValor("");
    setDatos(null);
    setActivo(-1);
    input.current?.focus();
    if (filtros.q) router.push(rutaCon(base, { ...filtros, q: "" }), { scroll: false });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!opciones.length) return;
      e.preventDefault();
      setAbierto(true);
      // -1 es "ninguna": el ciclo pasa por el input, como en cualquier combobox.
      const n = opciones.length;
      const abajo = e.key === "ArrowDown";
      setActivo((a) => (abajo ? (a + 1 >= n ? -1 : a + 1) : a - 1 < -1 ? n - 1 : a - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (visible && activo >= 0 && opciones[activo]) ir(opciones[activo].href, opciones[activo].grupo);
      else buscar();
      return;
    }
    if (e.key === "Escape") {
      if (visible) {
        e.preventDefault();
        setAbierto(false);
        setActivo(-1);
      } else if (valor) {
        e.preventDefault();
        setValor("");
      }
    }
  };

  /** Props de una opción: el índice en la lista plana decide si está activa. */
  const opcion = (id: string) => {
    const i = opciones.findIndex((o) => o.id === id);
    return {
      id,
      role: "option" as const,
      "aria-selected": i === activo,
      onClick: () => ir(opciones[i].href, opciones[i].grupo),
      onPointerMove: () => setActivo(i),
      className: `flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left text-base text-ink-text ${
        i === activo ? "bg-surface-container-high" : "hover:bg-surface-container"
      }`,
    };
  };

  const encabezado = (texto: string, id: string) => (
    <div id={id} role="presentation" className="px-3 pb-1 pt-3 text-sm font-semibold text-ink-soft">
      {texto}
    </div>
  );

  return (
    <div ref={contenedor} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          buscar();
        }}
        className="group relative"
      >
        <span
          className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-ink-soft transition-colors group-focus-within:text-ink-display"
          aria-hidden
        >
          search
        </span>
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-label="Buscar productos del catálogo"
          aria-expanded={visible}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={visible ? idActivo : undefined}
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setAbierto(true);
            setActivo(-1);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-12 w-full rounded border border-outline-variant/40 bg-surface-container-lowest/90 pl-11 pr-12 text-base text-ink-text shadow-xs backdrop-blur-sm transition-all placeholder:text-ink-soft focus:border-amber focus:bg-surface-container-lowest focus:shadow-md focus:outline-none focus:ring-2 focus:ring-amber/30 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {valor && (
          <button
            type="button"
            onClick={limpiar}
            aria-label="Borrar la búsqueda"
            className="absolute right-0.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded text-ink-soft transition-all hover:bg-surface-container hover:text-ink-text active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
      </form>

      {/* Cuántas sugerencias hay, para quien no ve la lista. */}
      <p className="sr-only" aria-live="polite">
        {visible
          ? sinNada
            ? `Sin coincidencias en ${CATALOGOS[catalogo].nombre}`
            : `${opciones.length} sugerencias`
          : ""}
      </p>

      {/* La lista vive DENTRO del contenedor del buscador: las filas de la
          barra que se colapsan al hacer scroll tienen overflow-hidden y la
          recortarían. */}
      <div
        id={idLista}
        role="listbox"
        aria-label="Sugerencias"
        hidden={!visible}
        // El clic no debe quitarle el foco al input antes de elegir.
        onPointerDown={(e) => e.preventDefault()}
        className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[60vh] overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface-container-lowest p-1.5 shadow-lg"
      >
        {vigentes && (
          <>
            {!sinNada && (
              <div {...opcion(`${idBase}-buscar`)}>
                <span className="material-symbols-outlined text-[20px] text-ink-soft" aria-hidden>
                  search
                </span>
                <span className="min-w-0 flex-1">
                  Buscar “<strong className="font-bold text-ink-display">{consulta}</strong>”
                  {vigentes.aproximado && <span className="text-ink-soft"> · parecidos</span>}
                </span>
                <span className="shrink-0 text-sm text-ink-soft">
                  {vigentes.total} {vigentes.total === 1 ? "producto" : "productos"}
                </span>
              </div>
            )}

            {vigentes.secciones.length > 0 && (
              <div role="group" aria-labelledby={`${idBase}-h-sec`}>
                {encabezado("Secciones", `${idBase}-h-sec`)}
                {vigentes.secciones.map((s) => (
                  <div key={s.slug} {...opcion(`${idBase}-sec-${s.slug}`)}>
                    <span className="min-w-0 flex-1">
                      <Resaltado texto={s.nombre} consulta={consulta} />
                    </span>
                    <span className="shrink-0 text-sm text-ink-soft">{s.conteo}</span>
                  </div>
                ))}
              </div>
            )}

            {vigentes.categorias.length > 0 && (
              <div role="group" aria-labelledby={`${idBase}-h-cat`}>
                {encabezado("Categorías", `${idBase}-h-cat`)}
                {vigentes.categorias.map((c) => (
                  <div key={c.slug} {...opcion(`${idBase}-cat-${c.slug}`)}>
                    <span className="min-w-0 flex-1">
                      <Resaltado texto={c.nombre} consulta={consulta} />
                    </span>
                    <span className="shrink-0 text-sm text-ink-soft">{c.conteo}</span>
                  </div>
                ))}
              </div>
            )}

            {vigentes.colores.length > 0 && (
              <div role="group" aria-labelledby={`${idBase}-h-color`}>
                {encabezado("Colores", `${idBase}-h-color`)}
                {vigentes.colores.map((c) => (
                  <div key={c.slug} {...opcion(`${idBase}-color-${c.slug}`)}>
                    <span aria-hidden>
                      <ColorSwatch hex={c.hex} nombre={c.nombre} size="sm" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <Resaltado texto={c.nombre} consulta={consulta} />
                    </span>
                    <span className="shrink-0 text-sm text-ink-soft">{c.conteo}</span>
                  </div>
                ))}
              </div>
            )}

            {vigentes.productos.length > 0 && (
              <div role="group" aria-labelledby={`${idBase}-h-prod`}>
                {encabezado("Productos", `${idBase}-h-prod`)}
                {vigentes.productos.map((p) => (
                  <div key={p.slug} {...opcion(`${idBase}-prod-${p.slug}`)}>
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded bg-surface-container">
                      {p.foto && (
                        // eslint-disable-next-line @next/next/no-img-element -- miniatura de 40px del derivado sm, ya optimizado
                        <img src={p.foto} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        <Resaltado texto={p.nombre} consulta={consulta} />
                      </span>
                      {p.categoria && <span className="block truncate text-sm text-ink-soft">{p.categoria}</span>}
                    </span>
                    {p.precio != null && (
                      <span className="shrink-0 text-right text-sm font-bold text-amber">
                        {p.desde && <span className="font-semibold text-ink-soft">desde </span>}
                        {pesos.format(p.precio)}
                        <span className="font-semibold text-ink-soft">{p.sufijo}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {sinNada && (
              <p className="px-3 py-3 text-base text-ink-soft">
                Sin coincidencias en {CATALOGOS[catalogo].nombre}
                {vigentes.enOtroCatalogo.total === 0 && ". Prueba con otra palabra o con el código."}
              </p>
            )}
            {opciones.some((o) => o.grupo === "otro") && (
              <div {...opcion(`${idBase}-otro`)}>
                <span className="material-symbols-outlined text-[20px] text-ink-soft" aria-hidden>
                  arrow_forward
                </span>
                <span className="min-w-0 flex-1">
                  Buscar en {CATALOGOS[vigentes.enOtroCatalogo.catalogo].nombre} ({vigentes.enOtroCatalogo.total})
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
