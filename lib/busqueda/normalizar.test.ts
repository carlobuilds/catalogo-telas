import { describe, it, expect } from "vitest";
import { compacto, distancia, normalizar, palabrasDeConsulta, raiz, tokens } from "./normalizar";

describe("normalizar", () => {
  it("quita acentos, mayúsculas y signos", () => {
    expect(normalizar("PEDRERÍA")).toBe("pedreria");
    expect(normalizar("Piedra 1404 · 25 pz · A")).toBe("piedra 1404 25 pz a");
    expect(normalizar("  Botón   de  perlas ")).toBe("boton de perlas");
    expect(normalizar("Ñandutí")).toBe("nanduti");
    expect(normalizar(null)).toBe("");
  });

  it("parte en palabras y compacta códigos", () => {
    expect(tokens("Tira de dos-hileras")).toEqual(["tira", "de", "dos", "hileras"]);
    expect(tokens("   ")).toEqual([]);
    expect(compacto("BNK-2030-68")).toBe("bnk203068");
  });
});

describe("raiz", () => {
  it("da la misma raíz al singular y al plural", () => {
    for (const [a, b] of [
      ["boton", "botones"],
      ["flor", "flores"],
      ["piedra", "piedras"],
      ["broche", "broches"],
      ["encaje", "encajes"],
      ["cristal", "cristales"],
    ]) {
      expect(raiz(a), `${a}/${b}`).toBe(raiz(b));
    }
  });

  it("no toca palabras cortas", () => {
    expect(raiz("oro")).toBe("oro");
    expect(raiz("pz")).toBe("pz");
  });
});

describe("palabrasDeConsulta", () => {
  it("quita las palabras vacías, salvo que no haya otra cosa", () => {
    expect(palabrasDeConsulta("tira de pedrería con oro")).toEqual(["tira", "pedreria", "oro"]);
    expect(palabrasDeConsulta("de")).toEqual(["de"]);
  });
});

describe("distancia", () => {
  it("cuenta cambios, inserciones y letras volteadas", () => {
    expect(distancia("pedreia", "pedreria")).toBe(1);
    expect(distancia("botnoes", "botones")).toBe(1);
    expect(distancia("boton", "boton")).toBe(0);
    expect(distancia("abc", "xyz")).toBe(3);
  });

  it("corta en cuanto se pasa del máximo", () => {
    expect(distancia("pedreria", "chifon", 1)).toBeGreaterThan(1);
  });
});
