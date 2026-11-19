import { describe, expect, it } from "vitest";
import {
  elegirUnidad,
  filaNuevaVariante,
  revisarChoque,
  revisarMoverVariante,
  siguienteOrden,
  validarOpciones,
} from "./mover-foto";

const ROJO = "11111111-1111-4111-8111-111111111111";
const AZUL = "22222222-2222-4222-8222-222222222222";

describe("validarOpciones", () => {
  it("color existente: exige un id válido", () => {
    expect(validarOpciones({ color: { tipo: "existente", colorId: ROJO } })).toEqual({
      ok: true,
      opciones: { color: { tipo: "existente", colorId: ROJO }, medida: null },
    });
    expect(validarOpciones({ color: { tipo: "existente", colorId: "rojo" } }).ok).toBe(false);
  });

  it("color nuevo: nombre y tono obligatorios; el tono se normaliza en minúsculas", () => {
    expect(validarOpciones({ color: { tipo: "nuevo", nombre: " Coral ", hex: "#FF7F50" } })).toEqual({
      ok: true,
      opciones: { color: { tipo: "nuevo", nombre: "Coral", hex: "#ff7f50" }, medida: null },
    });
    expect(validarOpciones({ color: { tipo: "nuevo", nombre: "", hex: "#ff7f50" } }).ok).toBe(false);
    expect(validarOpciones({ color: { tipo: "nuevo", nombre: "Coral", hex: "coral" } }).ok).toBe(false);
  });

  it("la medida se recorta y vacía es null", () => {
    const r = validarOpciones({ color: { tipo: "ninguno" }, medida: "  5 cm " });
    expect(r.ok && r.opciones.medida).toBe("5 cm");
    const r2 = validarOpciones({ color: { tipo: "ninguno" }, medida: "   " });
    expect(r2.ok && r2.opciones.medida).toBeNull();
  });

  it("sin color elegido no pasa", () => {
    expect(validarOpciones({}).ok).toBe(false);
    expect(validarOpciones(null).ok).toBe(false);
  });
});

describe("revisarChoque", () => {
  const destino = [{ id: "v1", color_id: ROJO, unidad_venta: "pieza", orden: 0 }];

  it("un color que ya está en el destino se rechaza y dice cuál es la variante", () => {
    const r = revisarChoque(destino, { tipo: "existente", colorId: ROJO });
    expect(r).toMatchObject({ ok: false, varianteExistenteId: "v1" });
  });

  it("un color distinto o recién creado pasa", () => {
    expect(revisarChoque(destino, { tipo: "existente", colorId: AZUL })).toEqual({ ok: true });
    expect(revisarChoque(destino, { tipo: "nuevo", nombre: "Coral", hex: "#ff7f50" })).toEqual({ ok: true });
  });

  it("sin color solo en un producto vacío (uno recién creado)", () => {
    expect(revisarChoque(destino, { tipo: "ninguno" }).ok).toBe(false);
    expect(revisarChoque([], { tipo: "ninguno" })).toEqual({ ok: true });
  });
});

describe("elegirUnidad", () => {
  it("primero la que más usa el destino", () => {
    expect(
      elegirUnidad([{ unidad_venta: "pieza" }, { unidad_venta: "pieza" }, { unidad_venta: "par" }], "metro", "flores")
    ).toBe("pieza");
  });

  it("si el destino no tiene variantes, la del origen", () => {
    expect(elegirUnidad([], "bolsa", "flores")).toBe("bolsa");
  });

  it("si tampoco hay origen, la de la categoría; al final metro", () => {
    expect(elegirUnidad([], null, "copas")).toBe("par");
    expect(elegirUnidad([], null, null)).toBe("metro");
  });

  it("ignora valores que no son unidades válidas", () => {
    expect(elegirUnidad([{ unidad_venta: "kilo" }], "pieza", null)).toBe("pieza");
  });
});

describe("siguienteOrden y filaNuevaVariante", () => {
  it("el color nuevo va al final", () => {
    expect(siguienteOrden([])).toBe(0);
    expect(siguienteOrden([{ orden: 0 }, { orden: 4 }, { orden: null }])).toBe(5);
  });

  it("la fila nueva NUNCA lleva precio, código, existencia ni piezas", () => {
    const fila = filaNuevaVariante({ telaId: "t", colorId: ROJO, medida: "5 cm", unidad: "pieza", orden: 3 });
    expect(Object.keys(fila).sort()).toEqual(["color_id", "medida", "orden", "tela_id", "unidad_venta"]);
  });
});

describe("revisarMoverVariante", () => {
  const base = { variantesEnOrigen: 3, mismoProducto: false, colorId: ROJO, destino: [] };

  it("mover un color a otro producto que no lo tiene pasa", () => {
    expect(revisarMoverVariante({ ...base, destino: [{ id: "x", color_id: AZUL }] })).toEqual({ ok: true });
  });

  it("no deja vacío el producto de origen", () => {
    expect(revisarMoverVariante({ ...base, variantesEnOrigen: 1 }).ok).toBe(false);
  });

  it("no choca colores en el destino", () => {
    const r = revisarMoverVariante({ ...base, destino: [{ id: "x", color_id: ROJO }] });
    expect(r).toMatchObject({ ok: false, varianteExistenteId: "x" });
  });

  it("una variante sin color solo va a un producto vacío", () => {
    expect(revisarMoverVariante({ ...base, colorId: null, destino: [{ id: "x", color_id: AZUL }] }).ok).toBe(false);
    expect(revisarMoverVariante({ ...base, colorId: null, destino: [] })).toEqual({ ok: true });
  });

  it("al mismo producto no tiene sentido", () => {
    expect(revisarMoverVariante({ ...base, mismoProducto: true }).ok).toBe(false);
  });
});
