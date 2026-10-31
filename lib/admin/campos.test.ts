import { describe, it, expect } from "vitest";
import { CAMPOS_PRESENTES, leerCamposVariante, parseCampoNumerico } from "./campos";

const COLOR = "11111111-1111-4111-8111-111111111111";

function form(campos: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  return fd;
}

describe("leerCamposVariante — parche parcial", () => {
  it("si solo viene el color, NO trae precio, sku ni stock", () => {
    // Éste es el bug de producción: guardar el color escribía precio: null.
    const campos = leerCamposVariante(form({ color_id: COLOR }));
    expect(campos).toEqual({ color_id: COLOR });
    expect("precio" in campos).toBe(false);
    expect("sku" in campos).toBe(false);
    expect("stock" in campos).toBe(false);
  });

  it("lee el precio del campo `precio`, que es el nombre de la columna", () => {
    expect(leerCamposVariante(form({ precio: "59,50" })).precio).toBe(59.5);
  });

  it("un `precio` presente y vacío sí borra: la tienda lo dejó a consultar", () => {
    const campos = leerCamposVariante(form({ precio: "" }));
    expect("precio" in campos).toBe(true);
    expect(campos.precio).toBeNull();
  });

  it("un formulario viejo con `precio_metro` vacío no toca el precio", () => {
    // Una pestaña abierta antes del arreglo: el campo cargaba vacío por el bug.
    expect("precio" in leerCamposVariante(form({ precio_metro: "" }))).toBe(false);
  });

  it("un formulario viejo con `precio_metro` tecleado sí se respeta", () => {
    expect(leerCamposVariante(form({ precio_metro: "120" })).precio).toBe(120);
  });

  it("una casilla desmarcada pero presente da false", () => {
    const campos = leerCamposVariante(
      form({ [CAMPOS_PRESENTES]: "es_bordado,es_brillante", es_brillante: "on" })
    );
    expect(campos.es_bordado).toBe(false);
    expect(campos.es_brillante).toBe(true);
    // Las que el formulario no pintó no se tocan.
    expect("es_traslucida" in campos).toBe(false);
    expect("es_tornasol" in campos).toBe(false);
  });

  it("sin la lista de presentes, una casilla marcada igual cuenta", () => {
    expect(leerCamposVariante(form({ es_tornasol: "on" }))).toEqual({ es_tornasol: true });
  });

  it("el formulario completo trae todas las columnas", () => {
    const campos = leerCamposVariante(
      form({
        sku: " BO-12 ",
        color_id: "",
        acabado_id: "",
        precio: "18",
        unidad_venta: "bolsa",
        piezas_por_unidad: "25",
        gramaje: "",
        stock: "",
        [CAMPOS_PRESENTES]: "es_bordado,es_brillante,es_traslucida,es_tornasol",
      })
    );
    expect(campos).toEqual({
      sku: "BO-12",
      color_id: null,
      acabado_id: null,
      precio: 18,
      unidad_venta: "bolsa",
      piezas_por_unidad: 25,
      gramaje: null,
      stock: null,
      es_bordado: false,
      es_brillante: false,
      es_traslucida: false,
      es_tornasol: false,
    });
  });

  it("rechaza un precio negativo en vez de guardarlo", () => {
    expect(() => leerCamposVariante(form({ precio: "-3" }))).toThrow(/precio/);
  });
});

describe("parseCampoNumerico", () => {
  it("vacío es null, no cero", () => {
    expect(parseCampoNumerico("", "precio")).toBeNull();
    expect(parseCampoNumerico("0", "precio")).toBe(0);
  });
});
