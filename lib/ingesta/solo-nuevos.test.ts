import { describe, it, expect } from "vitest";
import { decidirFila, type EstadoFila } from "./solo-nuevos";

const estado = (e: Partial<EstadoFila>): EstadoFila => ({
  tela: "no",
  variante: "no",
  archivoEnBucket: false,
  ...e,
});

describe("decidirFila — solo-nuevos (default)", () => {
  it("producto y color nuevos: crea los dos", () => {
    expect(decidirFila("solo-nuevos", estado({}))).toEqual({
      accion: "escribir",
      tela: "crear",
      variante: "crear",
      reemplazarArchivo: false,
    });
  });

  it("producto que ya existía con un color nuevo: reusa el producto SIN reescribirlo", () => {
    const d = decidirFila("solo-nuevos", estado({ tela: "previa" }));
    expect(d).toMatchObject({ accion: "escribir", tela: "reusar", variante: "crear" });
  });

  it("color que ya existía: salta la fila (no pisa precio, código ni existencia)", () => {
    const d = decidirFila("solo-nuevos", estado({ tela: "previa", variante: "previa" }));
    expect(d.accion).toBe("saltar");
  });

  it("archivo que ya está en el bucket: salta (no reemplaza el recorte curado)", () => {
    const d = decidirFila("solo-nuevos", estado({ archivoEnBucket: true }));
    expect(d.accion).toBe("saltar");
  });

  it("segunda toma de un color creado en ESTA corrida: lo reusa", () => {
    const d = decidirFila("solo-nuevos", estado({ tela: "nueva", variante: "nueva" }));
    expect(d).toMatchObject({ accion: "escribir", tela: "reusar", variante: "reusar", reemplazarArchivo: false });
  });

  it("nunca permite reemplazar archivos", () => {
    for (const tela of ["no", "previa", "nueva"] as const) {
      for (const variante of ["no", "nueva"] as const) {
        const d = decidirFila("solo-nuevos", estado({ tela, variante }));
        if (d.accion === "escribir") expect(d.reemplazarArchivo).toBe(false);
      }
    }
  });
});

describe("decidirFila — actualizar (pedido explícito)", () => {
  it("reescribe lo existente, como la subida original", () => {
    expect(
      decidirFila("actualizar", estado({ tela: "previa", variante: "previa", archivoEnBucket: true }))
    ).toEqual({ accion: "escribir", tela: "actualizar", variante: "actualizar", reemplazarArchivo: true });
  });

  it("crea lo que no existe", () => {
    expect(decidirFila("actualizar", estado({}))).toMatchObject({ tela: "crear", variante: "crear" });
  });

  it("reusa lo que esta misma corrida ya escribió", () => {
    expect(decidirFila("actualizar", estado({ tela: "nueva", variante: "nueva" }))).toMatchObject({
      tela: "reusar",
      variante: "reusar",
    });
  });
});
