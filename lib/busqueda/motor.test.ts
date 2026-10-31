import { describe, it, expect } from "vitest";
import { construirIndice } from "./indice";
import { buscarModelos, sugerirGrupos } from "./motor";
import { FILAS, NOMBRES_CATEGORIA } from "./fixture";

const INDICE = construirIndice(FILAS, NOMBRES_CATEGORIA);
const buscar = (q: string) => buscarModelos(INDICE, q, { catalogo: "merceria" });

describe("buscarModelos", () => {
  it("'pedreria', 'PEDRERÍA' y 'pedreia' dan lo mismo", () => {
    const base = buscar("pedreria").ids;
    expect(base.length).toBeGreaterThan(0);
    expect(buscar("PEDRERÍA").ids).toEqual(base);
    expect(buscar("pedreia").ids).toEqual(base);
  });

  it("'boton' encuentra los Botones, en singular o plural", () => {
    expect(buscar("boton").ids).toEqual(expect.arrayContaining(["boton-perlas", "boton-flor"]));
    expect(buscar("botones").ids).toEqual(expect.arrayContaining(["boton-perlas", "boton-flor"]));
  });

  it("'tira oro' pide las DOS palabras", () => {
    // La tira de dos hileras tiene variante oro; la de navette solo plata.
    expect(buscar("tira oro").ids).toEqual(["tira-dos"]);
    expect(buscar("tira oro").aproximado).toBe(false);
  });

  it("'cristal' lleva a la piedra suelta (sinónimo)", () => {
    expect(buscar("cristal").ids).toEqual(expect.arrayContaining(["piedra-1404", "piedra-kpa"]));
  });

  it("un SKU exacto gana, con o sin guiones", () => {
    expect(buscar("BNK-2030-68").ids[0]).toBe("tira-dos");
    expect(buscar("bnk203068").skuExacto).toEqual(["tira-dos"]);
    expect(buscar("bo135").ids[0]).toBe("boton-perlas");
  });

  it("la última palabra cuenta como prefijo: se está escribiendo", () => {
    expect(buscar("boto").ids).toEqual(expect.arrayContaining(["boton-perlas", "boton-flor"]));
  });

  it("una consulta sin coincidencias da []", () => {
    expect(buscar("zzzz").ids).toEqual([]);
    expect(buscar("").ids).toEqual([]);
    expect(buscar("  ·  ").ids).toEqual([]);
  });

  it("si nada tiene todas las palabras, relaja a la mayoría y lo avisa", () => {
    const r = buscar("botón xyzw");
    expect(r.aproximado).toBe(true);
    expect(r.ids).toEqual(expect.arrayContaining(["boton-perlas", "boton-flor"]));
  });

  it("el orden es estable: a igual puntaje, por nombre", () => {
    const una = buscar("piedra").ids;
    expect(buscar("piedra").ids).toEqual(una);
    // "Botón de flor chico" y "Botón de perlas" empatan en "boton".
    const botones = buscar("boton").ids;
    expect(botones.indexOf("boton-flor")).toBeLessThan(botones.indexOf("boton-perlas"));
  });

  it("solo busca en el catálogo pedido", () => {
    expect(buscar("chifon").ids).toEqual([]);
    expect(buscarModelos(INDICE, "chifon", { catalogo: "telas" }).ids).toEqual(["chifon"]);
  });

  it("encuentra por la categoría extra ('también aparece en')", () => {
    // Las rosas son Flores, pero también salen en Aplicación de pedrería.
    expect(buscar("aplicacion pedreria").ids).toEqual(expect.arrayContaining(["rosas", "medallon"]));
  });
});

describe("sugerirGrupos", () => {
  it("ofrece la sección y las categorías que casan con lo escrito", () => {
    const g = sugerirGrupos(INDICE, "pedre", "merceria");
    expect(g.secciones.map((s) => s.slug)).toEqual(["pedreria"]);
    expect(g.categorias.map((c) => c.slug)).toEqual(
      expect.arrayContaining(["tira-de-pedreria", "aplicacion-de-pedreria"])
    );
  });

  it("'cristal' ofrece Cristalería y la piedra suelta", () => {
    const g = sugerirGrupos(INDICE, "cristal", "merceria");
    expect(g.secciones.map((s) => s.slug)).toEqual(["cristaleria"]);
    expect(g.categorias.map((c) => c.slug)).toEqual(["piedra-suelta"]);
  });

  it("ofrece colores, también por sinónimo", () => {
    expect(sugerirGrupos(INDICE, "dorado", "merceria").colores.map((c) => c.slug)).toEqual(["oro"]);
  });
});
