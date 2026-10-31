import { describe, it, expect } from "vitest";
import { resaltar } from "./resaltar";

const marcado = (texto: string, q: string) =>
  resaltar(texto, q)
    .filter((t) => t.marcado)
    .map((t) => t.texto);

describe("resaltar", () => {
  it("marca el texto original aunque la consulta no traiga acentos", () => {
    expect(marcado("Tira de pedrería", "pedreria")).toEqual(["pedrería"]);
    expect(marcado("Tira de pedrería", "PEDR")).toEqual(["pedr"]);
  });

  it("marca por raíz: 'botones' resalta 'Botón'", () => {
    expect(marcado("Botón de perlas", "botones")).toEqual(["Botón"]);
  });

  it("solo al inicio de palabra", () => {
    expect(marcado("Tesoro", "oro")).toEqual([]);
  });

  it("reconstruye el texto completo", () => {
    expect(resaltar("Aplicación rosas", "ros").map((t) => t.texto).join("")).toBe("Aplicación rosas");
  });
});
