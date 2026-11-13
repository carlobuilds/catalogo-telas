import { catalogoDeCategoria } from "@/lib/catalogos";

/**
 * "Para corregir": colores de un producto que probablemente estén mal
 * capturados. Se CALCULA al vuelo con lo que /admin ya lee (la vista y el
 * conteo de fotos): no hay columna ni bandera en la base, así que marcar no
 * escribe nada, y en cuanto la tienda acomoda el producto la marca desaparece
 * sola.
 *
 * Nació de un problema concreto: colores con varias fotos donde unas eran
 * repetidas y otras eran el MISMO artículo en otro tamaño (otro SKU, que va
 * en su propio producto, como las flores por diámetro).
 */
export type Motivo =
  /** Lo que el revisor dejó anotado en /revision. */
  | { tipo: "nota-revision"; nota: string }
  /** 2+ fotos en un color: repetidas, o de otro tamaño. */
  | { tipo: "fotos-de-mas"; fotos: number }
  /** Dos variantes del mismo color: la ficha solo deja llegar a la primera. */
  | { tipo: "color-repetido"; veces: number }
  /** Sin color en un producto con varios: no aparece en la ficha. */
  | { tipo: "sin-color" }
  /** Un color que se quedó sin fotos (pasa al mover la última a otro lado). */
  | { tipo: "sin-fotos" };

export type TipoMotivo = Motivo["tipo"];

/** Orden en que se muestran: primero lo que alguien ya escribió a mano. */
const ORDEN: TipoMotivo[] = ["nota-revision", "fotos-de-mas", "color-repetido", "sin-color", "sin-fotos"];

export type VarianteRevisable = {
  id: string;
  /**
   * Lo que identifica el color dentro del producto: `color_slug` en la lista
   * (la vista no trae `color_id`) o `color_id` en el editor. `null` = sin color.
   */
  colorClave: string | null;
  fotos: number;
  nota?: string | null;
};

/** Qué reglas aplican a un producto según su familia. */
export type Politica = {
  /** ¿Varias fotos en un color son sospechosas? */
  fotosDeMas: boolean;
  /** ¿Un color sin fotos (habiendo otros con foto) es sospechoso? */
  sinFotos: boolean;
};

/**
 * Las reglas de "fotos de más" y "sin fotos" solo aplican en MERCERÍA: en una
 * tela, varias fotos por color pueden ser tomas de caída o de detalle
 * (decisión de Carlo, 2026-11-12). Nota, color repetido y sin color aplican
 * siempre.
 *
 * Pendiente de decidir: la tira de tul bordado y el guipiur son mercería pero
 * se venden por metro, donde dos tomas también pueden ser normales. Si
 * estorban en la lista, aquí es donde se excluyen (pasando la unidad).
 */
export function politicaDeProducto(categoriaSlug: string | null | undefined): Politica {
  const merceria = catalogoDeCategoria(categoriaSlug) === "merceria";
  return { fotosDeMas: merceria, sinFotos: merceria };
}

/**
 * Motivos de sospecha de cada variante de UN producto, indexados por id. Las
 * variantes sin motivos no aparecen en el mapa.
 */
export function motivosPorVariante(
  variantes: VarianteRevisable[],
  politica: Politica
): Map<string, Motivo[]> {
  const porColor = new Map<string, number>();
  for (const v of variantes) {
    if (v.colorClave) porColor.set(v.colorClave, (porColor.get(v.colorClave) ?? 0) + 1);
  }
  const algunaConFoto = variantes.some((v) => v.fotos > 0);

  const resultado = new Map<string, Motivo[]>();
  for (const v of variantes) {
    const motivos: Motivo[] = [];
    const nota = v.nota?.trim();
    if (nota) motivos.push({ tipo: "nota-revision", nota });
    if (politica.fotosDeMas && v.fotos >= 2) motivos.push({ tipo: "fotos-de-mas", fotos: v.fotos });
    const veces = v.colorClave ? (porColor.get(v.colorClave) ?? 0) : 0;
    if (veces >= 2) motivos.push({ tipo: "color-repetido", veces });
    if (!v.colorClave && variantes.length >= 2) motivos.push({ tipo: "sin-color" });
    if (politica.sinFotos && v.fotos === 0 && algunaConFoto) motivos.push({ tipo: "sin-fotos" });

    if (motivos.length) {
      motivos.sort((a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo));
      resultado.set(v.id, motivos);
    }
  }
  return resultado;
}

/** Una línea en palabras de la tienda, para el editor. */
export function textoDeMotivo(m: Motivo): string {
  switch (m.tipo) {
    case "nota-revision":
      return `Nota de revisión: “${m.nota}”`;
    case "fotos-de-mas":
      return `${m.fotos} fotos en este color: ¿alguna está repetida o es de otro tamaño?`;
    case "color-repetido":
      return `Este color está ${m.veces} veces en el producto: en el catálogo solo se ve uno.`;
    case "sin-color":
      return "Sin color: en la ficha del catálogo no aparece.";
    case "sin-fotos":
      return "Sin fotos: en el catálogo sale con un recuadro gris.";
  }
}

/**
 * Resumen corto para la tarjeta de la lista, contando colores por motivo:
 * ["2 colores con fotos de más", "nota de revisión"].
 */
export function resumenDeMotivos(motivos: Map<string, Motivo[]>): string[] {
  const cuenta = new Map<TipoMotivo, number>();
  for (const lista of motivos.values()) {
    for (const m of lista) cuenta.set(m.tipo, (cuenta.get(m.tipo) ?? 0) + 1);
  }
  const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : `${n} ${varios}`);
  const frases: Record<TipoMotivo, (n: number) => string> = {
    "nota-revision": (n) => plural(n, "nota de revisión", "notas de revisión"),
    "fotos-de-mas": (n) => plural(n, "un color con fotos de más", "colores con fotos de más"),
    "color-repetido": (n) => plural(n, "color repetido", "variantes con color repetido"),
    "sin-color": (n) => plural(n, "una variante sin color", "variantes sin color"),
    "sin-fotos": (n) => plural(n, "un color sin fotos", "colores sin fotos"),
  };
  return ORDEN.filter((t) => cuenta.has(t)).map((t) => frases[t](cuenta.get(t)!));
}
