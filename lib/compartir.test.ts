import { describe, it, expect } from "vitest";
import { FILTROS_VACIOS, type Filtros } from "./filtros";
import { describirVista, mensajeCompartir, pastillasDeVista, rutaDeVista } from "./compartir";

const NOMBRES = {
  categorias: { "tira-de-pedreria": "Tira de pedrería", "aplicacion-de-pedreria": "Aplicación de pedrería" },
  colores: { oro: "Oro", plata: "Plata", rojo: "Rojo" },
};
const f = (over: Partial<Filtros>): Filtros => ({ ...FILTROS_VACIOS, ...over });

describe("describirVista", () => {
  it("sección › categoría · color", () => {
    expect(
      describirVista(f({ seccion: "pedreria", categorias: ["tira-de-pedreria"], colores: ["oro"] }), "merceria", NOMBRES)
    ).toBe("Pedrería › Tira de pedrería · Oro");
  });

  it("una búsqueda sola dice en qué catálogo", () => {
    expect(describirVista(f({ q: "rosas" }), "merceria", NOMBRES)).toBe("“rosas” en Mercería");
  });

  it("junta varios valores con comas y una 'y'", () => {
    expect(describirVista(f({ colores: ["oro", "plata", "rojo"] }), "merceria", NOMBRES)).toBe(
      "Mercería · Oro, Plata y Rojo"
    );
  });

  it("en Telas la sección no existe", () => {
    expect(describirVista(f({ seccion: "pedreria" }), "telas", NOMBRES)).toBe("Telas");
  });

  it("un slug desconocido no truena: se lee del slug", () => {
    expect(describirVista(f({ categorias: ["broche"] }), "merceria", NOMBRES)).toBe("Broche");
  });

  it("incluye propiedades, existencia y tope de precio", () => {
    expect(
      describirVista(f({ propiedades: ["brillante"], soloDisponibles: true, precioMax: 50 }), "merceria", NOMBRES)
    ).toBe("Mercería · Brillante · con existencia · hasta $50");
  });
});

describe("rutaDeVista", () => {
  it("arma la ruta del catálogo con sus filtros, sin `ver`", () => {
    expect(rutaDeVista("merceria", f({ seccion: "pedreria", categorias: ["tira-de-pedreria"] }))).toBe(
      "/?sec=pedreria&cat=tira-de-pedreria"
    );
    expect(rutaDeVista("telas", FILTROS_VACIOS)).toBe("/telas");
  });
});

describe("mensajeCompartir", () => {
  it("lleva la descripción y el link", () => {
    const m = mensajeCompartir("Pedrería · Oro", "https://ejemplo.mx/?sec=pedreria");
    expect(m).toContain("Pedrería · Oro");
    expect(m).toContain("https://ejemplo.mx/?sec=pedreria");
  });
});

describe("pastillasDeVista", () => {
  const vista = f({ q: "tira", seccion: "pedreria", categorias: ["tira-de-pedreria"], colores: ["oro", "plata"] });
  const pastillas = pastillasDeVista(vista, "merceria", NOMBRES);

  it("una por cada cosa activa, en orden de lectura", () => {
    expect(pastillas.map((p) => p.etiqueta)).toEqual(["“tira”", "Pedrería", "Tira de pedrería", "Oro", "Plata"]);
  });

  it("la ✕ quita SOLO esa pastilla", () => {
    expect(pastillas.find((p) => p.clave === "color-oro")?.sinEsta).toBe(
      "/?q=tira&sec=pedreria&cat=tira-de-pedreria&color=plata"
    );
    expect(pastillas.find((p) => p.clave === "q")?.sinEsta).toBe(
      "/?sec=pedreria&cat=tira-de-pedreria&color=oro,plata"
    );
  });

  it("sin filtros no hay pastillas", () => {
    expect(pastillasDeVista(FILTROS_VACIOS, "merceria", NOMBRES)).toEqual([]);
  });
});
