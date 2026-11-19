import { describe, expect, it } from "vitest";
import {
  motivosPorVariante,
  politicaDeProducto,
  resumenDeMotivos,
  textoDeMotivo,
  type VarianteRevisable,
} from "./sospechosos";

const MERCERIA = { fotosDeMas: true, sinFotos: true };
const TELA = { fotosDeMas: false, sinFotos: false };

const v = (id: string, colorClave: string | null, fotos: number, nota?: string | null): VarianteRevisable => ({
  id,
  colorClave,
  fotos,
  nota,
});

const tipos = (m: ReturnType<typeof motivosPorVariante>, id: string) => (m.get(id) ?? []).map((x) => x.tipo);

describe("politicaDeProducto", () => {
  it("fotos de más y sin fotos solo cuentan en mercería", () => {
    expect(politicaDeProducto("flores")).toEqual(MERCERIA);
    expect(politicaDeProducto(null)).toEqual(MERCERIA); // sin categoría cae a mercería
  });
});

describe("motivosPorVariante", () => {
  it("2+ fotos en un color de mercería es sospechoso; 1 foto no", () => {
    const m = motivosPorVariante([v("a", "rojo", 2), v("b", "azul", 1)], MERCERIA);
    expect(m.get("a")).toEqual([{ tipo: "fotos-de-mas", fotos: 2 }]);
    expect(m.has("b")).toBe(false);
  });

  it("en telas varias fotos por color son normales", () => {
    const m = motivosPorVariante([v("a", "rojo", 4)], TELA);
    expect(m.size).toBe(0);
  });

  it("la nota de revisión cuenta en cualquier familia, recortada; vacía no", () => {
    const m = motivosPorVariante([v("a", "rojo", 1, "  es de 5 cm  "), v("b", "azul", 1, "   "), v("c", "oro", 1, null)], TELA);
    expect(m.get("a")).toEqual([{ tipo: "nota-revision", nota: "es de 5 cm" }]);
    expect(m.has("b")).toBe(false);
    expect(m.has("c")).toBe(false);
  });

  it("color repetido marca a TODAS las variantes de ese color; sin color nunca es 'repetido'", () => {
    const m = motivosPorVariante([v("a", "plata", 1), v("b", "plata", 1), v("c", null, 1), v("d", null, 1)], TELA);
    expect(m.get("a")).toEqual([{ tipo: "color-repetido", veces: 2 }]);
    expect(m.get("b")).toEqual([{ tipo: "color-repetido", veces: 2 }]);
    expect(tipos(m, "c")).toEqual(["sin-color"]);
  });

  it("sin color solo es sospechoso cuando el producto tiene 2+ variantes (una bolsita sola no tiene color)", () => {
    expect(motivosPorVariante([v("a", null, 1)], MERCERIA).size).toBe(0);
    expect(tipos(motivosPorVariante([v("a", null, 1), v("b", "rojo", 1)], MERCERIA), "a")).toEqual(["sin-color"]);
  });

  it("un color sin fotos se marca si otro color sí tiene; si ninguno tiene, no (eso ya lo dice la lista)", () => {
    expect(tipos(motivosPorVariante([v("a", "rojo", 0), v("b", "azul", 1)], MERCERIA), "a")).toEqual(["sin-fotos"]);
    expect(motivosPorVariante([v("a", "rojo", 0), v("b", "azul", 0)], MERCERIA).size).toBe(0);
    expect(motivosPorVariante([v("a", "rojo", 0), v("b", "azul", 1)], TELA).size).toBe(0);
  });

  it("acumula motivos en un orden fijo: nota primero", () => {
    const m = motivosPorVariante([v("a", null, 3, "revisar"), v("b", "rojo", 1)], MERCERIA);
    expect(tipos(m, "a")).toEqual(["nota-revision", "fotos-de-mas", "sin-color"]);
  });
});

describe("textos", () => {
  it("textoDeMotivo habla en palabras de la tienda", () => {
    expect(textoDeMotivo({ tipo: "fotos-de-mas", fotos: 3 })).toMatch(/^3 fotos en este color/);
    expect(textoDeMotivo({ tipo: "nota-revision", nota: "es otra medida" })).toContain("es otra medida");
  });

  it("resumenDeMotivos cuenta colores por motivo, con singular y plural", () => {
    const m = motivosPorVariante(
      [v("a", "rojo", 2, "ojo"), v("b", "azul", 3), v("c", "oro", 1)],
      MERCERIA
    );
    expect(resumenDeMotivos(m)).toEqual(["nota de revisión", "2 colores con fotos de más"]);
    expect(resumenDeMotivos(motivosPorVariante([v("a", "rojo", 2)], MERCERIA))).toEqual([
      "un color con fotos de más",
    ]);
  });
});
