import { describe, expect, it } from "vitest";
import {
  contarPorFiltro,
  fichasDeFondos,
  filtrarFichas,
  leerFiltroFondos,
  type FilaFondo,
} from "./fondos";

const G = "2026-10-30T12:00:00.000Z";

function fila(cambios: Partial<FilaFondo> = {}): FilaFondo {
  return {
    foto_id: "f1",
    ruta_sm: "mascaras/sm/f1.webp",
    activa: true,
    revisada_en: null,
    fuente_generado_en: G,
    generado_en: "2026-11-03T00:00:00.000Z",
    pct_transicion: 1,
    foto: {
      ruta: "x/a.jpg",
      derivados: { generado_en: G },
      variante: { color: { nombre: "Oro" }, tela: { id: "t1", nombre: "Flor" } },
    },
    ...cambios,
  };
}

describe("fichasDeFondos", () => {
  it("arma el nombre con producto y color", () => {
    expect(fichasDeFondos([fila()])[0].nombre).toBe("Flor · Oro");
  });

  it("pone primero las más dudosas", () => {
    const fichas = fichasDeFondos([
      fila({ foto_id: "a", pct_transicion: 1 }),
      fila({ foto_id: "b", pct_transicion: 8 }),
    ]);
    expect(fichas.map((f) => f.fotoId)).toEqual(["b", "a"]);
  });

  it("descarta una fila sin foto y cae a la ruta si no hay tela", () => {
    expect(fichasDeFondos([fila({ foto: null })])).toEqual([]);
    const sinTela = fila({ foto: { ruta: "x/a.jpg", derivados: null, variante: null } });
    expect(fichasDeFondos([sinTela])[0].nombre).toBe("x/a.jpg");
  });

  it("marca como cambiada una foto reprocesada", () => {
    expect(fichasDeFondos([fila({ fuente_generado_en: "2026-01-01T00:00:00.000Z" })])[0].estado).toBe("vencida");
  });
});

describe("filtros", () => {
  const fichas = fichasDeFondos([
    fila({ foto_id: "a" }),
    fila({ foto_id: "b", activa: false }),
    fila({ foto_id: "c", activa: false, revisada_en: G }),
  ]);

  it("cuenta cada estado", () => {
    expect(contarPorFiltro(fichas)).toEqual({
      todas: 3, activa: 1, "sin-revisar": 1, excluida: 1, vencida: 0,
    });
  });

  it("filtra por estado", () => {
    expect(filtrarFichas(fichas, "sin-revisar").map((f) => f.fotoId)).toEqual(["b"]);
    expect(filtrarFichas(fichas, "todas")).toHaveLength(3);
  });

  it("un filtro desconocido en la URL cae a todas", () => {
    expect(leerFiltroFondos("inventado")).toBe("todas");
    expect(leerFiltroFondos(undefined)).toBe("todas");
    expect(leerFiltroFondos("activa")).toBe("activa");
  });
});
