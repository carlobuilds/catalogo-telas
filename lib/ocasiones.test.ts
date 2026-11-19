import { describe, it, expect } from "vitest";
import { etiquetaDeOcasion } from "./ocasiones";

describe("etiquetaDeOcasion", () => {
  const nombres = { "xv-anos": "XV años", "dia-de-muertos": "Día de Muertos" };

  it("usa el nombre de la tabla, con acentos y ñ", () => {
    expect(etiquetaDeOcasion("xv-anos", nombres)).toBe("XV años");
    expect(etiquetaDeOcasion("dia-de-muertos", nombres)).toBe("Día de Muertos");
  });

  it("sin nombre, convierte el slug en texto legible", () => {
    expect(etiquetaDeOcasion("vestido-de-noche", {})).toBe("Vestido de noche");
  });
});
