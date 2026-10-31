import { describe, it, expect } from "vitest";
import { FILTROS_VACIOS } from "@/lib/filtros";
import { construirIndice } from "./indice";
import { contarFacetas, facetasDeIndice } from "./facetas";
import { filtrarModelos } from "./seleccion";
import { fila } from "./fixture";

const PIEDRA = { categoria: "Piedra suelta", categoria_slug: "piedra-suelta" };
const indice = (...filas: Parameters<typeof fila>[0][]) => construirIndice(filas.map(fila));

describe("contarFacetas", () => {
  it("cuenta MODELOS, no variantes: la card del grid es un modelo", () => {
    // Un modelo con tres colores es UNA card, no tres.
    const f = contarFacetas(
      indice(
        { tela_id: "t1", tela_nombre: "T1", ...PIEDRA, color_slug: "oro", color_nombre: "Oro" },
        { tela_id: "t1", tela_nombre: "T1", ...PIEDRA, color_slug: "plata", color_nombre: "Plata" },
        { tela_id: "t1", tela_nombre: "T1", ...PIEDRA, color_slug: "hueso", color_nombre: "Hueso" }
      )
    );
    expect(f.categorias).toEqual([{ slug: "piedra-suelta", nombre: "Piedra suelta", conteo: 1 }]);
  });

  it("cuenta un modelo una sola vez por color aunque repita ese color", () => {
    const f = contarFacetas(
      indice(
        { tela_id: "t1", tela_nombre: "T1", color_slug: "oro", color_nombre: "Oro" },
        { tela_id: "t1", tela_nombre: "T1", color_slug: "oro", color_nombre: "Oro" },
        { tela_id: "t2", tela_nombre: "T2", color_slug: "oro", color_nombre: "Oro" }
      )
    );
    expect(f.colores).toEqual([{ slug: "oro", nombre: "Oro", hex: null, conteo: 2 }]);
  });

  it("ordena por cantidad y desempata por nombre en español", () => {
    const f = contarFacetas(
      indice(
        { tela_id: "t1", tela_nombre: "T1", categoria: "Copas", categoria_slug: "copas" },
        { tela_id: "t2", tela_nombre: "T2", categoria: "Botones", categoria_slug: "botones" },
        { tela_id: "t3", tela_nombre: "T3", categoria: "Botones", categoria_slug: "botones" },
        { tela_id: "t4", tela_nombre: "T4", categoria: "Ánfora", categoria_slug: "anfora" }
      )
    );
    expect(f.categorias.map((c) => c.nombre)).toEqual(["Botones", "Ánfora", "Copas"]);
  });

  it("omite lo que no tiene categoría o color en vez de inventar un cajón", () => {
    const f = contarFacetas(
      indice({ tela_id: "t1", tela_nombre: "T1" }, { tela_id: "t2", tela_nombre: "T2", ...PIEDRA })
    );
    expect(f.categorias.map((c) => c.slug)).toEqual(["piedra-suelta"]);
    expect(f.colores).toEqual([]);
  });

  it("solo devuelve las propiedades que algún producto tiene", () => {
    const f = contarFacetas(
      indice(
        { tela_id: "t1", tela_nombre: "T1", es_bordado: true },
        { tela_id: "t2", tela_nombre: "T2", es_bordado: true },
        { tela_id: "t3", tela_nombre: "T3" }
      )
    );
    expect(f.propiedades).toEqual([{ clave: "bordado", etiqueta: "Bordado", conteo: 2 }]);
  });

  it("avisa si nadie tiene stock capturado, para no pintar ese chip", () => {
    expect(contarFacetas(indice({ tela_id: "a", tela_nombre: "A", stock: 0 })).hayStock).toBe(false);
    expect(contarFacetas(indice({ tela_id: "a", tela_nombre: "A", stock: 3 })).hayStock).toBe(true);
  });

  it("un catálogo vacío no truena", () => {
    expect(contarFacetas([])).toEqual({ categorias: [], colores: [], propiedades: [], hayStock: false });
  });
});

describe("lo que no tiene categoría", () => {
  const i = indice(
    { tela_id: "sin", tela_nombre: "Sin categoría" },
    { tela_id: "p1", tela_nombre: "P1", ...PIEDRA }
  );

  it("cae en Mercería y sale en 'Todo', pero en ninguna sección", () => {
    expect(facetasDeIndice(i, "merceria").porCatalogo).toEqual({ merceria: 2, telas: 0 });
    expect(filtrarModelos(i, "merceria", FILTROS_VACIOS).map((m) => m.tela_id)).toContain("sin");
    expect(
      filtrarModelos(i, "merceria", { ...FILTROS_VACIOS, seccion: "cristaleria" }).map((m) => m.tela_id)
    ).toEqual(["p1"]);
  });

  it("omite las secciones vacías", () => {
    expect(facetasDeIndice(i, "merceria").secciones).toEqual([
      { slug: "cristaleria", nombre: "Cristalería", conteo: 1 },
    ]);
    expect(facetasDeIndice(i, "telas").secciones).toEqual([]);
  });
});
