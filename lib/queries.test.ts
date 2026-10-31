import { describe, it, expect } from "vitest";
import { enTrozos, ordenarPorPagina } from "./queries";

describe("ordenarPorPagina", () => {
  /** Filas de la vista: una por variante, varias por modelo. */
  const filas = (...pares: [string, string][]) =>
    pares.map(([tela_id, color]) => ({ tela_id, color }));

  it("agrupa por modelo en el orden de la página, no el de SQL", () => {
    // SQL ordena por nombre; la página ya viene con precio primero y por
    // relevancia, y es la que manda.
    const r = ordenarPorPagina(filas(["A", "rojo"], ["B", "oro"], ["C", "negro"]), ["C", "A", "B"]);
    expect(r.map((f) => f.tela_id)).toEqual(["C", "A", "B"]);
  });

  it("no mueve el orden de los colores dentro de un modelo", () => {
    const r = ordenarPorPagina(filas(["A", "1"], ["B", "x"], ["A", "2"], ["A", "3"]), ["B", "A"]);
    expect(r.map((f) => `${f.tela_id}${f.color}`)).toEqual(["Bx", "A1", "A2", "A3"]);
  });

  it("junta las filas de un modelo aunque lleguen separadas", () => {
    // Defensivo: si dos lecturas intercalaran modelos, la card no se parte.
    const r = ordenarPorPagina(filas(["A", "x"], ["B", "y"], ["A", "z"]), ["A", "B"]);
    expect(r.map((f) => f.tela_id)).toEqual(["A", "A", "B"]);
  });

  it("no truena con lista vacía", () => {
    expect(ordenarPorPagina([], ["A"])).toEqual([]);
  });
});

describe("enTrozos", () => {
  it("parte la lista de ids para que el `.in()` no reviente la URL", () => {
    expect(enTrozos([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(enTrozos([], 48)).toEqual([]);
  });
});
