import { describe, it, expect } from "vitest";
import {
  contarAvance,
  esVarianteLista,
  filtroDesdeParams,
  productoPasaFiltro,
  type VarianteDeCierre,
} from "./cierre";

const v = (o: Partial<VarianteDeCierre> = {}): VarianteDeCierre => ({
  revisado_en: null,
  precio_metro: null,
  foto_principal: null,
  nota: null,
  unidad_venta: "pieza",
  ...o,
});

const REVISADA = "2026-11-19T00:00:00Z";
const FOTO = "boton-bo12/bo12.jpg";
const completa = (o: Partial<VarianteDeCierre> = {}) =>
  v({ revisado_en: REVISADA, precio_metro: 12, foto_principal: FOTO, ...o });

describe("esVarianteLista — revisada, con precio y con foto", () => {
  it("con las tres cosas, está lista", () => {
    expect(esVarianteLista(completa())).toBe(true);
  });

  it("revisada pero sin precio NO está lista (el interruptor no exige precio)", () => {
    expect(esVarianteLista(completa({ precio_metro: null }))).toBe(false);
  });

  it("sin foto NO está lista", () => {
    expect(esVarianteLista(completa({ foto_principal: null }))).toBe(false);
  });

  it("con precio y foto pero sin revisar NO está lista", () => {
    expect(esVarianteLista(completa({ revisado_en: null }))).toBe(false);
  });

  it("precio en cero cuenta como capturado (es un dato, no un hueco)", () => {
    expect(esVarianteLista(completa({ precio_metro: 0 }))).toBe(true);
  });

  it("una nota 'a consultar' no la vuelve lista", () => {
    expect(esVarianteLista(completa({ precio_metro: null, nota: "a consultar" }))).toBe(false);
  });
});

describe("contarAvance", () => {
  it("cuenta cada cifra por separado y 'listas' solo con las tres", () => {
    const avance = contarAvance([
      completa(),
      v({ revisado_en: REVISADA }),
      v({ precio_metro: 10, foto_principal: FOTO }),
      v(),
    ]);
    expect(avance).toEqual({ total: 4, revisadas: 2, conPrecio: 2, conFoto: 2, listas: 1 });
  });

  it("'listas' usa el criterio que se le pase", () => {
    const avance = contarAvance([v({ precio_metro: 1 }), v()], (x) => x.precio_metro != null);
    expect(avance.listas).toBe(1);
  });

  it("sin variantes, todo en cero", () => {
    expect(contarAvance([])).toEqual({ total: 0, revisadas: 0, conPrecio: 0, conFoto: 0, listas: 0 });
  });
});

describe("filtros de /revision", () => {
  it("lee el chip de la URL; 'pendientes' conserva su nombre de siempre", () => {
    expect(filtroDesdeParams({})).toBe("todos");
    expect(filtroDesdeParams({ pendientes: "1" })).toBe("pendientes");
    expect(filtroDesdeParams({ sinprecio: "1" })).toBe("sinprecio");
    expect(filtroDesdeParams({ sinfoto: "1" })).toBe("sinfoto");
  });

  it("'Sin precio' deja el producto si UNO de sus colores no tiene precio", () => {
    expect(productoPasaFiltro([v({ precio_metro: 5 }), v()], "sinprecio")).toBe(true);
    expect(productoPasaFiltro([v({ precio_metro: 5 })], "sinprecio")).toBe(false);
  });

  it("'Sin foto' deja el producto si UNO de sus colores no tiene foto", () => {
    expect(productoPasaFiltro([v({ foto_principal: FOTO }), v()], "sinfoto")).toBe(true);
    expect(productoPasaFiltro([v({ foto_principal: FOTO })], "sinfoto")).toBe(false);
  });

  it("'Sin revisar' deja el producto si UNO de sus colores falta por revisar", () => {
    expect(productoPasaFiltro([v({ revisado_en: REVISADA }), v()], "pendientes")).toBe(true);
    expect(productoPasaFiltro([v({ revisado_en: REVISADA })], "pendientes")).toBe(false);
  });

  it("'Todos' no quita nada", () => {
    expect(productoPasaFiltro([], "todos")).toBe(true);
  });
});
