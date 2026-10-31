import { describe, it, expect } from "vitest";
import { FILTROS_VACIOS, type Filtros } from "@/lib/filtros";
import { construirIndice } from "./indice";
import { facetasDeIndice } from "./facetas";
import { filtrarModelos, primeroConPrecio, seleccionarModelos } from "./seleccion";
import { FILAS, NOMBRES_CATEGORIA, fila } from "./fixture";

const INDICE = construirIndice(FILAS, NOMBRES_CATEGORIA);
const f = (over: Partial<Filtros>): Filtros => ({ ...FILTROS_VACIOS, ...over });
const ids = (catalogo: "merceria" | "telas", over: Partial<Filtros> = {}) =>
  filtrarModelos(INDICE, catalogo, f(over)).map((m) => m.tela_id);

describe("construirIndice", () => {
  it("una entrada por modelo, en orden alfabético", () => {
    expect(INDICE.map((m) => m.tela_id)).toEqual([
      "medallon",
      "rosas",
      "boton-flor",
      "boton-perlas",
      "chifon",
      "piedra-1404",
      "piedra-kpa",
      "tira-dos",
      "tira-navette",
    ]);
  });

  it("el catálogo lo decide SOLO la categoría principal", () => {
    // Las rosas tienen "chifon" como extra: siguen en Mercería, y la extra
    // del otro catálogo se ignora.
    const rosas = INDICE.find((m) => m.tela_id === "rosas")!;
    expect(rosas.catalogo).toBe("merceria");
    expect(rosas.categorias.map((c) => c.slug)).toEqual(["flores", "aplicacion-de-pedreria"]);
    expect(rosas.secciones).toEqual(["flores", "pedreria"]);
    expect(rosas.categoria?.slug).toBe("flores");
  });

  it("guarda el precio real más bajo y la unidad de ESA variante", () => {
    const tira = INDICE.find((m) => m.tela_id === "tira-dos")!;
    expect(tira.precioDesde).toBe(75);
    expect(tira.tienePrecioReal).toBe(true);
    expect(INDICE.find((m) => m.tela_id === "boton-flor")!.tienePrecioReal).toBe(false);
  });

  it("sin la columna categorias_extra (antes de la migración) funciona igual", () => {
    const indice = construirIndice([fila({ tela_id: "x", tela_nombre: "X", categoria: "Flores", categoria_slug: "flores" })]);
    expect(indice[0].categorias.map((c) => c.slug)).toEqual(["flores"]);
  });
});

describe("filtrarModelos", () => {
  it("separa los catálogos", () => {
    expect(ids("telas")).toEqual(["chifon"]);
    expect(ids("merceria")).not.toContain("chifon");
  });

  it("un producto entra a una sección por su categoría extra", () => {
    expect(ids("merceria", { seccion: "pedreria" })).toEqual(
      expect.arrayContaining(["rosas", "medallon", "tira-dos", "tira-navette"])
    );
    expect(ids("merceria", { categorias: ["aplicacion-de-pedreria"] })).toEqual(["medallon", "rosas"]);
  });

  it("en Telas una sección se ignora", () => {
    expect(ids("telas", { seccion: "cristaleria" })).toEqual(["chifon"]);
  });

  it("un chip de categoría del otro catálogo no cuela productos", () => {
    expect(ids("merceria", { categorias: ["chifon"] })).toEqual([]);
  });

  it("los filtros de variante piden UNA variante que cumpla todos", () => {
    expect(ids("merceria", { categorias: ["tira-de-pedreria"], colores: ["oro"] })).toEqual(["tira-dos"]);
    expect(ids("merceria", { precioMax: 70 })).toEqual(["rosas", "boton-perlas", "piedra-1404", "tira-navette"]);
  });
});

describe("primeroConPrecio", () => {
  it("es una partición estable", () => {
    const con = new Set(["b", "d"]);
    expect(primeroConPrecio(["a", "b", "c", "d"], (id) => con.has(id))).toEqual(["b", "d", "a", "c"]);
  });
});

describe("seleccionarModelos", () => {
  it("sin búsqueda: con precio primero y alfabético dentro de cada grupo", () => {
    const r = seleccionarModelos(INDICE, "merceria", f({ seccion: "pedreria" }));
    expect(r.ids).toEqual(["rosas", "tira-dos", "tira-navette", "medallon"]);
  });

  it("con búsqueda: el SKU exacto va primero aunque no tenga precio", () => {
    const indice = construirIndice([
      ...FILAS,
      fila({ tela_id: "sin-precio", tela_nombre: "Botón sin precio", categoria: "Botones", categoria_slug: "botones", sku: "BX-1" }),
    ]);
    expect(seleccionarModelos(indice, "merceria", f({ q: "bx-1" })).ids[0]).toBe("sin-precio");
  });

  it("con precio = con precio en las variantes que se van a ver", () => {
    // Filtrando "oro", el único precio real de botón-flor no existe, y el de
    // la tira dorada sí: la tira va antes.
    const r = seleccionarModelos(INDICE, "merceria", f({ colores: ["oro"] }));
    expect(r.ids[0]).toBe("tira-dos");
  });
});

describe("facetasDeIndice", () => {
  const facetas = facetasDeIndice(INDICE, "merceria");

  it("cuenta las extras en sus categorías y secciones", () => {
    expect(facetas.categorias.find((c) => c.slug === "aplicacion-de-pedreria")?.conteo).toBe(2);
    expect(facetas.secciones.find((s) => s.slug === "pedreria")?.conteo).toBe(4);
  });

  it("cuenta modelos, no variantes", () => {
    expect(facetas.categorias.find((c) => c.slug === "tira-de-pedreria")?.conteo).toBe(2);
    expect(facetas.colores.find((c) => c.slug === "plata")?.conteo).toBe(3);
  });

  it("da el conteo de cada catálogo para el selector", () => {
    expect(facetas.porCatalogo).toEqual({ merceria: 8, telas: 1 });
  });

  it("no pinta propiedades ni stock que nadie capturó", () => {
    expect(facetas.propiedades).toEqual([]);
    expect(facetas.hayStock).toBe(false);
  });
});
