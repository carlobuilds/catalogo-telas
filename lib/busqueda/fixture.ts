/**
 * Catálogo de juguete para las pruebas de `lib/busqueda`: pocos modelos, pero
 * con los casos que importan (acentos, plurales, SKU con guiones, extras de
 * categoría, modelos sin precio). Solo lo importan los `.test.ts`.
 */
import type { FilaIndice } from "@/lib/busqueda/indice";

let consecutivo = 0;

export function fila(over: Partial<FilaIndice> & Pick<FilaIndice, "tela_id" | "tela_nombre">): FilaIndice {
  consecutivo += 1;
  return {
    variante_id: `v${String(consecutivo).padStart(3, "0")}`,
    tela_slug: over.tela_id,
    categoria: null,
    categoria_slug: null,
    sku: null,
    color_nombre: null,
    color_slug: null,
    color_hex: null,
    precio_metro: null,
    unidad_venta: "pieza",
    stock: null,
    es_bordado: false,
    es_brillante: false,
    es_traslucida: false,
    es_tornasol: false,
    foto_principal: null,
    foto_principal_derivados: null,
    variante_orden: 0,
    ...over,
  };
}

const PIEDRA = { categoria: "Piedra suelta", categoria_slug: "piedra-suelta" };
const TIRA = { categoria: "Tira de pedrería", categoria_slug: "tira-de-pedreria" };
const BOTONES = { categoria: "Botones", categoria_slug: "botones" };
const FLORES = { categoria: "Flores", categoria_slug: "flores" };
const APLICACION = { categoria: "Aplicación de pedrería", categoria_slug: "aplicacion-de-pedreria" };
const CHIFON = { categoria: "Chifón", categoria_slug: "chifon" };
const ORO = { color_nombre: "Oro", color_slug: "oro", color_hex: "#C9A227" };
const PLATA = { color_nombre: "Plata", color_slug: "plata", color_hex: "#C0C0C0" };
const ROJO = { color_nombre: "Rojo", color_slug: "rojo", color_hex: "#B00020" };

export const FILAS: FilaIndice[] = [
  fila({ tela_id: "piedra-1404", tela_nombre: "Piedra 1404 · 25 pz · A", ...PIEDRA, sku: "PCC-1404", precio_metro: 35 }),
  fila({ tela_id: "piedra-kpa", tela_nombre: "Piedra suelta KPA", ...PIEDRA, ...PLATA }),
  fila({ tela_id: "tira-dos", tela_nombre: "Tira de dos hileras de piedra", ...TIRA, ...ORO, sku: "BNK-2030-68", precio_metro: 80 }),
  fila({ tela_id: "tira-dos", tela_nombre: "Tira de dos hileras de piedra", ...TIRA, ...PLATA, sku: "BNK-2030-69", precio_metro: 75, variante_orden: 1 }),
  fila({ tela_id: "tira-navette", tela_nombre: "Tira de navette alternada", ...TIRA, ...PLATA, precio_metro: 60 }),
  fila({ tela_id: "boton-perlas", tela_nombre: "Botón de perlas", ...BOTONES, sku: "BO135", precio_metro: 12 }),
  fila({ tela_id: "boton-flor", tela_nombre: "Botón de flor chico", ...BOTONES, ...ORO }),
  fila({ tela_id: "rosas", tela_nombre: "Aplicación rosas", ...FLORES, ...ROJO, precio_metro: 45, categorias_extra: ["aplicacion-de-pedreria", "chifon"] }),
  fila({ tela_id: "medallon", tela_nombre: "Aplicación de medallón oval calado", ...APLICACION, ...ORO }),
  fila({ tela_id: "chifon", tela_nombre: "Chifón Lunares", ...CHIFON, unidad_venta: "metro", precio_metro: 59 }),
];

export const NOMBRES_CATEGORIA: Record<string, string> = {
  "piedra-suelta": "Piedra suelta",
  "tira-de-pedreria": "Tira de pedrería",
  botones: "Botones",
  flores: "Flores",
  "aplicacion-de-pedreria": "Aplicación de pedrería",
  chifon: "Chifón",
};
