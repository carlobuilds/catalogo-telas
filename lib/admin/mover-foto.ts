import { UNIDADES_VENTA, type UnidadVenta } from "@/lib/unidades";
import { unidadDeCategoria } from "@/lib/ingesta/categorias";

/**
 * Reglas para REACOMODAR en /admin: mandar una foto a un color nuevo (aquí, en
 * otro producto o en un producto nuevo) y mover un color completo a otro
 * producto. Puras —sin Supabase— para poder probarlas; las acciones de
 * `app/admin/actions.ts` solo leen, preguntan aquí y escriben.
 *
 * La regla de fondo es la de la ficha pública: solo se navega POR COLOR
 * (`?color=`). Dos variantes del mismo color en un producto, o una sin color
 * junto a otras, no se pueden ver en el catálogo. Por eso "otro tamaño" es
 * otro PRODUCTO (como las flores por diámetro), y aquí se rechaza lo que
 * crearía esos huecos en vez de dejar que la tienda lo descubra después.
 */

export const HEX_RE = /^#[0-9a-f]{6}$/i;

/** De qué color es la variante nueva. */
export type ColorDestino =
  | { tipo: "existente"; colorId: string }
  | { tipo: "nuevo"; nombre: string; hex: string }
  /** Solo se permite en un producto que todavía no tiene variantes. */
  | { tipo: "ninguno" };

export type OpcionesNuevaVariante = { color: ColorDestino; medida: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida lo que manda el modal. Llega del cliente, así que se revisa todo:
 * un POST puede traer cualquier cosa.
 */
export function validarOpciones(
  entrada: unknown
): { ok: true; opciones: OpcionesNuevaVariante } | { ok: false; error: string } {
  const o = (entrada ?? {}) as { color?: Record<string, unknown>; medida?: unknown };
  const c = o.color ?? {};
  const medida = typeof o.medida === "string" && o.medida.trim() ? o.medida.trim().slice(0, 80) : null;

  if (c.tipo === "existente") {
    if (typeof c.colorId !== "string" || !UUID.test(c.colorId)) {
      return { ok: false, error: "Ese color no es válido. Elige uno de la lista." };
    }
    return { ok: true, opciones: { color: { tipo: "existente", colorId: c.colorId }, medida } };
  }
  if (c.tipo === "nuevo") {
    const nombre = typeof c.nombre === "string" ? c.nombre.trim() : "";
    const hex = typeof c.hex === "string" ? c.hex.trim().toLowerCase() : "";
    if (!nombre) return { ok: false, error: "Escribe el nombre del color nuevo." };
    if (nombre.length > 40) return { ok: false, error: "El nombre del color es demasiado largo." };
    if (!HEX_RE.test(hex)) return { ok: false, error: "Elige el tono del color nuevo." };
    return { ok: true, opciones: { color: { tipo: "nuevo", nombre, hex }, medida } };
  }
  if (c.tipo === "ninguno") return { ok: true, opciones: { color: { tipo: "ninguno" }, medida } };
  return { ok: false, error: "Elige de qué color es." };
}

/** Lo que hace falta saber de las variantes del producto de destino. */
export type VarianteDestino = {
  id: string;
  color_id: string | null;
  unidad_venta: string | null;
  orden: number | null;
};

export type Choque =
  | { ok: true }
  | { ok: false; error: string; varianteExistenteId?: string };

/**
 * ¿Se puede crear una variante con este color en este producto?
 * - Un color que ya está → no: se ofrece mover la foto a esa variante.
 * - Sin color → solo si el producto está vacío (un producto nuevo).
 * Un color recién creado nunca choca.
 */
export function revisarChoque(
  destino: VarianteDestino[],
  color: ColorDestino,
  nombreProducto = "Ese producto"
): Choque {
  if (color.tipo === "ninguno") {
    return destino.length === 0
      ? { ok: true }
      : {
          ok: false,
          error: `${nombreProducto} ya tiene colores: una variante sin color no aparecería en la ficha. Elige su color.`,
        };
  }
  if (color.tipo === "existente") {
    const ya = destino.find((v) => v.color_id === color.colorId);
    if (ya) {
      return {
        ok: false,
        error: `${nombreProducto} ya tiene ese color. Si es la misma pieza, súmala a ese color; si es de otro tamaño, va en el producto de esa medida.`,
        varianteExistenteId: ya.id,
      };
    }
  }
  return { ok: true };
}

const esUnidad = (u: string | null | undefined): u is UnidadVenta =>
  !!u && (UNIDADES_VENTA as readonly string[]).includes(u);

/**
 * Unidad de venta de la variante nueva. Antes nacía siempre en "metro" (el
 * default de la columna) y una flor movida salía cobrada "/m".
 *
 * En orden: la que más usan las variantes del DESTINO (es el producto donde va
 * a vivir), la de la variante de ORIGEN (la foto es del mismo artículo), la de
 * la CATEGORÍA del destino, y al final "metro".
 */
export function elegirUnidad(
  destino: Pick<VarianteDestino, "unidad_venta">[],
  unidadOrigen: string | null | undefined,
  categoriaDestino: string | null | undefined
): UnidadVenta {
  const cuenta = new Map<UnidadVenta, number>();
  for (const v of destino) {
    if (esUnidad(v.unidad_venta)) cuenta.set(v.unidad_venta, (cuenta.get(v.unidad_venta) ?? 0) + 1);
  }
  const masUsada = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (masUsada) return masUsada;
  if (esUnidad(unidadOrigen)) return unidadOrigen;
  const porCategoria = unidadDeCategoria(categoriaDestino);
  if (esUnidad(porCategoria)) return porCategoria;
  return "metro";
}

/** Al final de los colores del destino: llegar primero sería una sorpresa. */
export function siguienteOrden(destino: Pick<VarianteDestino, "orden">[]): number {
  return destino.reduce((max, v) => Math.max(max, v.orden ?? -1), -1) + 1;
}

/**
 * La fila de la variante nueva. A propósito NO lleva precio, código (SKU),
 * existencia ni piezas por unidad: otro tamaño es otro precio y otro código,
 * y copiarlos del origen inventaría datos. La tienda los captura en el editor.
 */
export function filaNuevaVariante(p: {
  telaId: string;
  colorId: string | null;
  medida: string | null;
  unidad: UnidadVenta;
  orden: number;
}) {
  return {
    tela_id: p.telaId,
    color_id: p.colorId,
    medida: p.medida,
    unidad_venta: p.unidad,
    orden: p.orden,
  };
}

/**
 * ¿Se puede mover este color COMPLETO (con su código, precio, existencia y
 * fotos) a otro producto?
 */
export function revisarMoverVariante(p: {
  /** Cuántas variantes tiene el producto de ORIGEN, contando esta. */
  variantesEnOrigen: number;
  mismoProducto: boolean;
  colorId: string | null;
  destino: Pick<VarianteDestino, "id" | "color_id">[];
  nombreDestino?: string;
}): Choque {
  const nombre = p.nombreDestino ?? "Ese producto";
  if (p.mismoProducto) return { ok: false, error: "Ese color ya está en este producto." };
  if (p.variantesEnOrigen <= 1) {
    return {
      ok: false,
      error:
        "Es el único color de este producto: si lo mueves, el producto se queda vacío y ya no se ve en ningún lado. Si todo el producto está mal, cámbiale el nombre o la categoría.",
    };
  }
  if (!p.colorId && p.destino.length > 0) {
    return {
      ok: false,
      error: `Esta variante no tiene color y ${nombre} ya tiene colores: no aparecería en la ficha. Ponle su color primero.`,
    };
  }
  const ya = p.colorId ? p.destino.find((v) => v.color_id === p.colorId) : undefined;
  if (ya) {
    return {
      ok: false,
      error: `${nombre} ya tiene ese color. Si es la misma pieza, mueve sus fotos a ese color en lugar del color completo.`,
      varianteExistenteId: ya.id,
    };
  }
  return { ok: true };
}
