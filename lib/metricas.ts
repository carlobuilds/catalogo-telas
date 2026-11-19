import type { CartItem } from "@/lib/store";

/**
 * Contador de uso del catálogo (sección 18 del SQL, tabla `evento_catalogo`).
 *
 * Existe para responder con cifras reales la duda de la tienda ("¿alguien lo
 * usa?"): cuántos pedidos salen por WhatsApp y cuántas veces se comparte el
 * catálogo. NO es analítica de visitas y NO guarda datos personales: ni
 * teléfono, ni IP, ni qué productos lleva el carrito.
 *
 * Flujo: el botón dispara `registrarEvento` (lib/metricas-cliente.ts) →
 * `POST /api/evento` → `validarEvento` aquí → insert con service_role, solo
 * en producción.
 */

export const TIPOS_EVENTO = ["pedido_whatsapp", "compartir_catalogo", "compartir_vista"] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export type EventoCatalogo = {
  tipo: TipoEvento;
  /** Solo la ruta, sin querystring: "/", "/telas", "/tela/boton-bo12". */
  ruta: string;
  /** Solo en pedido_whatsapp. */
  renglones?: number | null;
  total_estimado?: number | null;
  hay_sin_precio?: boolean | null;
};

/**
 * Qué se guarda de un pedido enviado por WhatsApp: tres cifras sin nada
 * personal ni qué productos lleva.
 *
 * - `renglones`: cuántos artículos distintos (no la cantidad de cada uno).
 * - `total_estimado`: SOLO con precios reales capturados. Un precio de
 *   referencia (demo) no entra, para no reportar dinero que la tienda nunca
 *   fijó. Si ningún artículo tiene precio real, queda vacío en vez de $0.
 * - `hay_sin_precio`: el pedido lleva algo "a consultar" (sin precio o con
 *   precio de referencia). Mide si la falta de precios está frenando pedidos.
 *
 * `validarEvento` redondea y acota lo que le llegue, así que aquí no se valida.
 */
export function armarEventoPedido(items: readonly CartItem[], ruta: string): EventoCatalogo {
  const conPrecioReal = items.filter((i) => i.precio != null && !i.precio_referencia);
  const total = conPrecioReal.reduce((suma, i) => suma + (i.precio ?? 0) * i.cantidad, 0);
  return {
    tipo: "pedido_whatsapp",
    ruta: soloRuta(ruta),
    renglones: items.length,
    total_estimado: conPrecioReal.length > 0 ? Math.round(total * 100) / 100 : null,
    hay_sin_precio: conPrecioReal.length < items.length,
  };
}

/** Quita querystring y fragmento: lo que se buscó o filtró no se guarda. */
export function soloRuta(ruta: string): string {
  return ruta.split(/[?#]/)[0] || "/";
}

const TOPE_RENGLONES = 500;
const TOPE_TOTAL = 10_000_000;

/**
 * Lo que llega por la red es de cualquiera: se valida todo y se descarta lo
 * que no cuadra (null = no se guarda). Los topes son los mismos `check` de la
 * tabla, para que un POST falso no reviente el insert.
 */
export function validarEvento(x: unknown): EventoCatalogo | null {
  if (typeof x !== "object" || x === null) return null;
  const o = x as Record<string, unknown>;
  if (!TIPOS_EVENTO.includes(o.tipo as TipoEvento)) return null;
  if (typeof o.ruta !== "string" || !o.ruta.startsWith("/")) return null;

  const evento: EventoCatalogo = { tipo: o.tipo as TipoEvento, ruta: soloRuta(o.ruta).slice(0, 300) };
  if (evento.tipo !== "pedido_whatsapp") return evento;

  if (Number.isInteger(o.renglones) && (o.renglones as number) >= 0 && (o.renglones as number) <= TOPE_RENGLONES) {
    evento.renglones = o.renglones as number;
  }
  if (typeof o.total_estimado === "number" && Number.isFinite(o.total_estimado)) {
    const total = Math.round(o.total_estimado * 100) / 100;
    if (total >= 0 && total <= TOPE_TOTAL) evento.total_estimado = total;
  }
  if (typeof o.hay_sin_precio === "boolean") evento.hay_sin_precio = o.hay_sin_precio;
  return evento;
}

export type FilaEvento = {
  creado_en: string;
  tipo: string;
  total_estimado: number | null;
};

export type ResumenSemana = {
  /** Lunes de la semana, AAAA-MM-DD, en hora de Fresnillo. */
  semana: string;
  pedidos: number;
  compartidos: number;
  /** Suma de lo estimado en los pedidos que traían total. */
  totalEstimado: number;
};

/** Zacatecas está en UTC−6 todo el año desde 2022 (sin horario de verano). */
const DESFASE_FRESNILLO_MS = -6 * 60 * 60 * 1000;

/** Lunes de la semana del evento, contado en hora local de la tienda. */
export function lunesDe(creadoEn: string): string {
  const local = new Date(new Date(creadoEn).getTime() + DESFASE_FRESNILLO_MS);
  const diasDesdeLunes = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - diasDesdeLunes);
  return local.toISOString().slice(0, 10);
}

/** Una fila por semana, la más reciente primero. */
export function resumirPorSemana(eventos: readonly FilaEvento[]): ResumenSemana[] {
  const porSemana = new Map<string, ResumenSemana>();
  for (const e of eventos) {
    const semana = lunesDe(e.creado_en);
    const fila = porSemana.get(semana) ?? { semana, pedidos: 0, compartidos: 0, totalEstimado: 0 };
    if (e.tipo === "pedido_whatsapp") {
      fila.pedidos++;
      fila.totalEstimado += e.total_estimado ?? 0;
    } else {
      fila.compartidos++;
    }
    porSemana.set(semana, fila);
  }
  return [...porSemana.values()].sort((a, b) => b.semana.localeCompare(a.semana));
}
