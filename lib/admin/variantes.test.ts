import { describe, expect, it } from "vitest";
import { etiquetaVariante } from "./variantes";

describe("etiquetaVariante", () => {
  it("color, medida y código, en ese orden", () => {
    expect(etiquetaVariante({ colorNombre: "Plata", medida: "3 cm", sku: "FL12" })).toBe("Plata · 3 cm · SKU FL12");
  });

  it("sin color pero con código: el código basta (como las bolsitas)", () => {
    expect(etiquetaVariante({ sku: "1404" })).toBe("SKU 1404");
    expect(etiquetaVariante({ sku: "1404", medida: "5 mm" })).toBe("5 mm · SKU 1404");
  });

  it("sin nada dice 'Sin color', y distingue por medida si la hay", () => {
    expect(etiquetaVariante({})).toBe("Sin color");
    expect(etiquetaVariante({ medida: "5 cm" })).toBe("Sin color · 5 cm");
  });

  it("ignora textos en blanco", () => {
    expect(etiquetaVariante({ colorNombre: "Oro", medida: "  ", sku: "" })).toBe("Oro");
  });
});
