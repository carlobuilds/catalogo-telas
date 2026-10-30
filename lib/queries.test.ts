import { describe, it, expect } from "vitest";
import {
  categoriasPermitidas,
  contarFacetas,
  facetasDeCatalogo,
  recortarAModelos,
} from "./queries";
import { FILTROS_VACIOS } from "./filtros";

/** Una fila de la vista, con lo mínimo que mira `contarFacetas`. */
function fila(over: Partial<Parameters<typeof contarFacetas>[0][number]> = {}) {
  return {
    tela_id: "t1",
    categoria: "Piedra suelta",
    categoria_slug: "piedra-suelta",
    color_nombre: null,
    color_slug: null,
    color_hex: null,
    stock: null,
    es_bordado: false,
    es_brillante: false,
    es_traslucida: false,
    es_tornasol: false,
    ...over,
  } as Parameters<typeof contarFacetas>[0][number];
}

describe("contarFacetas", () => {
  it("cuenta MODELOS, no variantes: la card del grid es un modelo", () => {
    // Un modelo con tres colores es UNA card, no tres.
    const f = contarFacetas([
      fila({ tela_id: "t1", color_slug: "oro", color_nombre: "Oro" }),
      fila({ tela_id: "t1", color_slug: "plata", color_nombre: "Plata" }),
      fila({ tela_id: "t1", color_slug: "hueso", color_nombre: "Hueso" }),
    ]);
    expect(f.categorias).toEqual([{ slug: "piedra-suelta", nombre: "Piedra suelta", conteo: 1 }]);
  });

  it("cuenta un modelo una sola vez por color aunque repita ese color", () => {
    const f = contarFacetas([
      fila({ tela_id: "t1", color_slug: "oro", color_nombre: "Oro" }),
      fila({ tela_id: "t1", color_slug: "oro", color_nombre: "Oro" }),
      fila({ tela_id: "t2", color_slug: "oro", color_nombre: "Oro" }),
    ]);
    expect(f.colores).toEqual([{ slug: "oro", nombre: "Oro", hex: null, conteo: 2 }]);
  });

  it("ordena por cantidad y desempata por nombre en español", () => {
    const f = contarFacetas([
      fila({ tela_id: "t1", categoria: "Copas", categoria_slug: "copas" }),
      fila({ tela_id: "t2", categoria: "Botones", categoria_slug: "botones" }),
      fila({ tela_id: "t3", categoria: "Botones", categoria_slug: "botones" }),
      fila({ tela_id: "t4", categoria: "Ánfora", categoria_slug: "anfora" }),
    ]);
    expect(f.categorias.map((c) => c.nombre)).toEqual(["Botones", "Ánfora", "Copas"]);
  });

  it("omite las filas sin categoría o sin color en vez de inventar un cajón", () => {
    const f = contarFacetas([
      fila({ categoria: null, categoria_slug: null }),
      fila({ tela_id: "t2", color_slug: null, color_nombre: null }),
    ]);
    expect(f.categorias.map((c) => c.slug)).toEqual(["piedra-suelta"]);
    expect(f.colores).toEqual([]);
  });

  it("solo devuelve las propiedades que algún producto tiene", () => {
    // Sin esto la portada pinta cuatro chips que no filtran nada.
    const f = contarFacetas([
      fila({ tela_id: "t1", es_bordado: true }),
      fila({ tela_id: "t2", es_bordado: true }),
      fila({ tela_id: "t3" }),
    ]);
    expect(f.propiedades).toEqual([{ clave: "bordado", etiqueta: "Bordado", conteo: 2 }]);
  });

  it("avisa si nadie tiene stock capturado, para no pintar ese chip", () => {
    expect(contarFacetas([fila({ stock: null }), fila({ stock: 0 })]).hayStock).toBe(false);
    expect(contarFacetas([fila({ stock: 3 })]).hayStock).toBe(true);
  });

  it("un catálogo vacío no truena", () => {
    expect(contarFacetas([])).toEqual({
      categorias: [],
      colores: [],
      propiedades: [],
      hayStock: false,
    });
  });
});

describe("recortarAModelos", () => {
  /** Filas de la vista: una por variante, varias por modelo. */
  const filas = (...pares: [string, string][]) =>
    pares.map(([tela_id, color]) => ({ tela_id, color_slug: color })) as never[];

  it("corta por MODELO, no por fila: nunca parte un modelo a la mitad", () => {
    // Éste es el bug que motivó paginar así: si se corta por filas, la card
    // del modelo B saldría con un solo color y un "desde $X" equivocado.
    const r = recortarAModelos(
      filas(["A", "rojo"], ["A", "azul"], ["B", "oro"], ["B", "plata"], ["C", "negro"]),
      2
    );
    expect(r.filas.map((f) => f.tela_id)).toEqual(["A", "A", "B", "B"]);
    expect(r.totalModelos).toBe(3);
  });

  it("cuenta modelos, no filas, en el total", () => {
    const r = recortarAModelos(filas(["A", "r"], ["A", "a"], ["A", "v"]), 48);
    expect(r.totalModelos).toBe(1);
    expect(r.filas).toHaveLength(3);
  });

  it("respeta el orden en que llegan los modelos", () => {
    const r = recortarAModelos(filas(["C", "x"], ["A", "y"], ["B", "z"]), 2);
    expect(r.filas.map((f) => f.tela_id)).toEqual(["C", "A"]);
  });

  it("devuelve todo cuando caben todos", () => {
    const r = recortarAModelos(filas(["A", "x"], ["B", "y"]), 48);
    expect(r.filas).toHaveLength(2);
    expect(r.totalModelos).toBe(2);
  });

  it("no truena con lista vacía", () => {
    expect(recortarAModelos([], 48)).toEqual({ filas: [], totalModelos: 0 });
  });

  it("junta las filas de un modelo aunque lleguen separadas", () => {
    // Defensivo: si el orden de SQL intercalara dos modelos, el recorte no
    // debe dejar fuera la mitad de uno que sí entró.
    const r = recortarAModelos(filas(["A", "x"], ["B", "y"], ["A", "z"]), 1);
    expect(r.filas.map((f) => f.tela_id)).toEqual(["A", "A"]);
  });
});

describe("categoriasPermitidas", () => {
  const TODAS = ["chifon", "tul-bordado", "piedra-suelta", "tira-de-pedreria", "flores", "lentejuela"];

  it("separa telas de mercería; lo desconocido y lo sin categoría van a mercería", () => {
    expect(categoriasPermitidas(TODAS, "telas", FILTROS_VACIOS)).toEqual({
      slugs: ["chifon", "tul-bordado"],
      sinCategoria: false,
    });
    expect(categoriasPermitidas(TODAS, "merceria", FILTROS_VACIOS)).toEqual({
      slugs: ["piedra-suelta", "tira-de-pedreria", "flores", "lentejuela"],
      sinCategoria: true,
    });
  });

  it("la sección acota dentro de mercería y deja fuera lo sin categoría", () => {
    const f = { ...FILTROS_VACIOS, seccion: "cristaleria" };
    expect(categoriasPermitidas(TODAS, "merceria", f)).toEqual({
      slugs: ["piedra-suelta"],
      sinCategoria: false,
    });
  });

  it("en Telas una sección se ignora en vez de vaciar el catálogo", () => {
    const f = { ...FILTROS_VACIOS, seccion: "cristaleria" };
    expect(categoriasPermitidas(TODAS, "telas", f).slugs).toEqual(["chifon", "tul-bordado"]);
  });

  it("un chip de categoría del otro catálogo no cuela productos", () => {
    // Un link viejo `/?cat=chifon` no debe meter tela en Mercería.
    const f = { ...FILTROS_VACIOS, categorias: ["chifon", "flores"] };
    expect(categoriasPermitidas(TODAS, "merceria", f)).toEqual({
      slugs: ["flores"],
      sinCategoria: false,
    });
  });
});

describe("facetasDeCatalogo", () => {
  const FILAS = [
    fila({ tela_id: "chifon", categoria: "Chifón", categoria_slug: "chifon" }),
    fila({ tela_id: "p1", categoria: "Piedra suelta", categoria_slug: "piedra-suelta" }),
    fila({ tela_id: "p2", categoria: "Piedra suelta", categoria_slug: "piedra-suelta" }),
    fila({ tela_id: "a1", categoria: "Aplicación de pedrería", categoria_slug: "aplicacion-de-pedreria" }),
    fila({ tela_id: "a1", categoria: "Aplicación de pedrería", categoria_slug: "aplicacion-de-pedreria" }),
    fila({ tela_id: "sin", categoria: null, categoria_slug: null }),
  ];

  it("cuenta las categorías solo del catálogo pedido", () => {
    expect(facetasDeCatalogo(FILAS, "telas").categorias.map((c) => c.slug)).toEqual(["chifon"]);
    expect(facetasDeCatalogo(FILAS, "merceria").categorias.map((c) => c.slug)).toEqual([
      "piedra-suelta",
      "aplicacion-de-pedreria",
    ]);
  });

  it("cuenta modelos por sección y omite las secciones vacías", () => {
    expect(facetasDeCatalogo(FILAS, "merceria").secciones).toEqual([
      { slug: "cristaleria", nombre: "Cristalería", conteo: 2 },
      { slug: "pedreria", nombre: "Pedrería", conteo: 1 },
    ]);
    expect(facetasDeCatalogo(FILAS, "telas").secciones).toEqual([]);
  });

  it("da el conteo de modelos de los dos catálogos para el selector", () => {
    // 4 modelos de mercería (p1, p2, a1 y el que no tiene categoría) y 1 de tela.
    expect(facetasDeCatalogo(FILAS, "telas").porCatalogo).toEqual({ merceria: 4, telas: 1 });
  });
});
