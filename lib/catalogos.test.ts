import { describe, it, expect } from "vitest";
import {
  CATALOGO_PORTADA,
  CATEGORIAS_DE_TELA,
  SECCIONES_MERCERIA,
  catalogoDeCategoria,
  categoriasExtraPosibles,
  esRutaDeCatalogo,
  rutaDeCatalogo,
  seccionDeCategoria,
  seccionPorSlug,
} from "./catalogos";
import { CATEGORIAS } from "./ingesta/categorias";

describe("catalogoDeCategoria", () => {
  it("manda la tela de verdad a Telas", () => {
    for (const slug of ["chifon", "tul", "tul-bordado"]) {
      expect(catalogoDeCategoria(slug), slug).toBe("telas");
    }
  });

  it("manda los avíos a Mercería, incluida la tira de tul bordado", () => {
    for (const slug of ["piedra-suelta", "guipiur", "botones", "tira-de-tul-bordado"]) {
      expect(catalogoDeCategoria(slug), slug).toBe("merceria");
    }
  });

  it("lo desconocido y lo que no tiene categoría caen en Mercería", () => {
    // /revision crea categorías al vuelo: casi siempre son avíos.
    expect(catalogoDeCategoria("lentejuela")).toBe("merceria");
    expect(catalogoDeCategoria(null)).toBe("merceria");
    expect(catalogoDeCategoria(undefined)).toBe("merceria");
  });
});

describe("secciones de Mercería", () => {
  it("toda categoría de mercería que asigna la ingesta tiene sección", () => {
    // Si alguien agrega una categoría a `lib/ingesta/categorias.ts`, esta prueba
    // avisa que hay que acomodarla en una sección antes de que solo salga en "Todo".
    const huerfanas = Object.values(CATEGORIAS)
      .map((c) => c.slug)
      .filter((slug) => catalogoDeCategoria(slug) === "merceria" && !seccionDeCategoria(slug));
    expect(huerfanas).toEqual([]);
  });

  it("ninguna sección mete una categoría de tela", () => {
    for (const s of SECCIONES_MERCERIA) {
      for (const slug of s.categorias) expect(CATEGORIAS_DE_TELA.has(slug), slug).toBe(false);
    }
  });

  it("una categoría vive en una sola sección", () => {
    const todas = SECCIONES_MERCERIA.flatMap((s) => s.categorias);
    expect(new Set(todas).size).toBe(todas.length);
  });

  it("la cristalería es la piedra suelta, aparte de la pedrería", () => {
    expect(seccionDeCategoria("piedra-suelta")?.slug).toBe("cristaleria");
    expect(seccionDeCategoria("aplicacion-de-pedreria")?.slug).toBe("pedreria");
  });

  it("resuelve slugs y tolera los que no existen", () => {
    expect(seccionPorSlug("flores")?.nombre).toBe("Flores");
    expect(seccionPorSlug("no-existe")).toBeNull();
    expect(seccionPorSlug(null)).toBeNull();
    expect(seccionDeCategoria(null)).toBeNull();
  });
});

describe("rutas", () => {
  it("la portada se sirve en / y el otro catálogo en su ruta", () => {
    expect(rutaDeCatalogo(CATALOGO_PORTADA)).toBe("/");
    expect(rutaDeCatalogo(CATALOGO_PORTADA === "telas" ? "merceria" : "telas")).not.toBe("/");
  });

  it("reconoce / y la ruta fija como el mismo catálogo", () => {
    expect(esRutaDeCatalogo("/", CATALOGO_PORTADA)).toBe(true);
    expect(esRutaDeCatalogo("/merceria", "merceria")).toBe(true);
    expect(esRutaDeCatalogo("/telas", "telas")).toBe(true);
    expect(esRutaDeCatalogo("/telas", "merceria")).toBe(false);
    expect(esRutaDeCatalogo("/tela/chifon-lunares", "telas")).toBe(false);
  });
});

describe("categoriasExtraPosibles", () => {
  const TODAS = [{ slug: "flores" }, { slug: "tira-de-pedreria" }, { slug: "chifon" }, { slug: "tul" }];

  it("ofrece solo las del mismo catálogo que la principal, sin repetirla", () => {
    expect(categoriasExtraPosibles(TODAS, "flores").map((c) => c.slug)).toEqual(["tira-de-pedreria"]);
    expect(categoriasExtraPosibles(TODAS, "chifon").map((c) => c.slug)).toEqual(["tul"]);
  });

  it("sin principal, el producto es de Mercería y se le ofrece mercería", () => {
    expect(categoriasExtraPosibles(TODAS, null).map((c) => c.slug)).toEqual(["flores", "tira-de-pedreria"]);
  });
});
