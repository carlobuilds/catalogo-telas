/**
 * Lectura de los formularios de /admin → valores para la BD.
 * ===========================================================================
 * Vive fuera de `app/admin/actions.ts` para poder probarse: un archivo
 * `"use server"` solo puede exportar acciones, y estas funciones son puras.
 *
 * La regla que no se negocia es el PARCHE PARCIAL: un guardado escribe SOLO
 * los campos que trae el formulario. Un campo ausente no es "vacío", es "no lo
 * toqué". Así fue como el editor borró precios en producción: el input se
 * llamaba `precio_metro`, la acción leía `precio_metro`, cargaba vacío (la
 * tabla trae `precio`) y al guardar escribía `precio: null` en TODAS las
 * columnas de la variante, aunque la tienda solo hubiera cambiado el color.
 */

import { UNIDADES_VENTA, type UnidadVenta } from "@/lib/unidades";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(valor: FormDataEntryValue | null, campo: string): string {
  const id = String(valor ?? "");
  if (!UUID_RE.test(id)) throw new Error(`Identificador inválido para ${campo}.`);
  return id;
}

/** UUID opcional: "" (opción "— sin —" de un <select>) ⇒ null. */
export function uuidOpcional(valor: FormDataEntryValue | null, campo: string): string | null {
  const id = String(valor ?? "").trim();
  if (id === "") return null;
  if (!UUID_RE.test(id)) throw new Error(`Identificador inválido para ${campo}.`);
  return id;
}

/**
 * Campo numérico del formulario → valor para la BD.
 * - Vacío ⇒ null ("precio a consultar" / stock desconocido). NO es cero:
 *   cero significa "gratis" o "sin existencia" y se captura explícito.
 * - Acepta coma o punto decimal ("59,50" y "59.50").
 * - Negativos o no numéricos ⇒ error (la BD también los rechazaría por CHECK).
 */
export function parseCampoNumerico(valor: FormDataEntryValue | null, campo: string): number | null {
  const texto = String(valor ?? "").trim();
  if (texto === "") return null;

  const n = Number(texto.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Valor inválido para ${campo}: "${texto}". Usa un número mayor o igual a 0, o déjalo vacío.`);
  }
  return Math.round(n * 100) / 100; // 2 decimales, como numeric(10,2)
}

/** Entero ≥ 0 o null (gramaje). */
export function parseEntero(valor: FormDataEntryValue | null, campo: string): number | null {
  const n = parseCampoNumerico(valor, campo);
  return n == null ? null : Math.round(n);
}

/** Texto opcional: recortado; vacío ⇒ null (ej. sku, descripción, alt). */
export function textoOpcional(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

/**
 * Unidad de venta validada contra el check de la sección 13 del SQL. Se valida
 * aquí y no solo en el `<select>` porque un POST puede traer cualquier cosa;
 * un valor fuera de la lista lo rechazaría Postgres con un error críptico.
 */
export function parseUnidadVenta(valor: FormDataEntryValue | null): UnidadVenta {
  const texto = String(valor ?? "").trim().toLowerCase();
  if (texto === "") return "metro"; // default de la columna
  if (!(UNIDADES_VENTA as readonly string[]).includes(texto)) {
    throw new Error(
      `Unidad de venta inválida: "${texto}". Usa una de: ${UNIDADES_VENTA.join(", ")}.`
    );
  }
  return texto as UnidadVenta;
}

/** Las casillas de propiedades ópticas de la variante. */
export const CASILLAS_VARIANTE = ["es_bordado", "es_brillante", "es_traslucida", "es_tornasol"] as const;

/**
 * Nombre del `<input type="hidden">` que lista las casillas que el formulario
 * PINTÓ. Hace falta porque una casilla desmarcada no viaja en el FormData: sin
 * esta lista, "la desmarqué" y "este formulario no la tiene" se ven iguales.
 */
export const CAMPOS_PRESENTES = "campos_presentes";

export type CamposVariante = {
  sku: string | null;
  color_id: string | null;
  acabado_id: string | null;
  precio: number | null;
  unidad_venta: UnidadVenta;
  piezas_por_unidad: number | null;
  gramaje: number | null;
  stock: number | null;
  es_bordado: boolean;
  es_brillante: boolean;
  es_traslucida: boolean;
  es_tornasol: boolean;
};

/**
 * Campos de variante compartidos entre alta y edición, como PARCHE PARCIAL:
 * solo trae las claves que vienen en el formulario.
 *
 * El precio se lee de `precio`, que es el nombre de la columna. Un formulario
 * viejo —una pestaña abierta en la tablet desde antes del arreglo— todavía
 * manda `precio_metro`: si trae un número se respeta (alguien lo tecleó), y
 * si viene vacío se ignora, porque vacío es justo lo que pintaba el bug.
 */
export function leerCamposVariante(formData: FormData): Partial<CamposVariante> {
  const campos: Partial<CamposVariante> = {};

  // NUNCA inventar SKU: solo se guarda lo que la tienda capture.
  if (formData.has("sku")) campos.sku = textoOpcional(formData.get("sku"));
  if (formData.has("color_id")) campos.color_id = uuidOpcional(formData.get("color_id"), "color");
  if (formData.has("acabado_id")) {
    campos.acabado_id = uuidOpcional(formData.get("acabado_id"), "acabado");
  }

  if (formData.has("precio")) {
    campos.precio = parseCampoNumerico(formData.get("precio"), "precio");
  } else if (textoOpcional(formData.get("precio_metro")) != null) {
    campos.precio = parseCampoNumerico(formData.get("precio_metro"), "precio");
  }

  if (formData.has("unidad_venta")) campos.unidad_venta = parseUnidadVenta(formData.get("unidad_venta"));
  if (formData.has("piezas_por_unidad")) {
    campos.piezas_por_unidad = parseEntero(formData.get("piezas_por_unidad"), "piezas por unidad");
  }
  if (formData.has("gramaje")) campos.gramaje = parseEntero(formData.get("gramaje"), "gramaje");
  if (formData.has("stock")) campos.stock = parseCampoNumerico(formData.get("stock"), "stock");

  const presentes = new Set(
    String(formData.get(CAMPOS_PRESENTES) ?? "")
      .split(",")
      .map((s) => s.trim())
  );
  for (const casilla of CASILLAS_VARIANTE) {
    if (presentes.has(casilla) || formData.has(casilla)) {
      campos[casilla] = formData.get(casilla) === "on";
    }
  }

  return campos;
}
