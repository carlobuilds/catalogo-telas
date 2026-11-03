import { describe, it, expect } from "vitest";
import {
  activaSegunFecha,
  claveFoto,
  conMascaras,
  esContenedor,
  estadoDeMascara,
  indiceDeMascaras,
  interruptorEncendido,
  mascaraDe,
  mascaraVigente,
  type FilaMascaraConFoto,
} from "./fondo-blanco";

describe("mascaraVigente", () => {
  const generado = "2026-10-30T12:00:00.000Z";

  it("vale si la máscara se generó de esos mismos derivados", () => {
    expect(mascaraVigente(generado, generado)).toBe(true);
  });

  it("no vale si la foto se reprocesó después", () => {
    expect(mascaraVigente(generado, "2026-11-01T09:00:00.000Z")).toBe(false);
  });

  it("ante la duda no vale: se ve la foto original", () => {
    expect(mascaraVigente(null, generado)).toBe(false);
    expect(mascaraVigente(generado, null)).toBe(false);
    expect(mascaraVigente(undefined, undefined)).toBe(false);
    expect(mascaraVigente("", "")).toBe(false);
  });
});

describe("activaSegunFecha", () => {
  const corte = new Date("2026-11-03T00:00:00.000Z");

  it("enciende las fotos subidas antes de la fecha de corte", () => {
    expect(activaSegunFecha("2026-10-30T12:00:00+00:00", corte)).toBe(true);
  });

  it("incluye la fecha exacta de corte", () => {
    expect(activaSegunFecha("2026-11-03T00:00:00+00:00", corte)).toBe(true);
  });

  it("deja apagadas las fotos nuevas", () => {
    expect(activaSegunFecha("2026-11-03T00:00:01+00:00", corte)).toBe(false);
  });

  it("una fecha ilegible queda apagada", () => {
    expect(activaSegunFecha("no es fecha", corte)).toBe(false);
  });
});

describe("esContenedor", () => {
  it("reconoce los cuencos y las bolsitas", () => {
    expect(esContenedor("piedra-suelta")).toBe(true);
    expect(esContenedor("bolsa-de-piedra")).toBe(true);
  });

  it("lo demás, o sin categoría, no es contenedor", () => {
    expect(esContenedor("flores")).toBe(false);
    expect(esContenedor(null)).toBe(false);
  });
});

describe("interruptorEncendido", () => {
  it("solo un true explícito lo prende", () => {
    expect(interruptorEncendido({ activo: true })).toBe(true);
  });

  it("cualquier otra cosa lo deja apagado", () => {
    for (const valor of [null, undefined, {}, { activo: false }, { activo: "true" }, { activo: 1 }, "true"]) {
      expect(interruptorEncendido(valor)).toBe(false);
    }
  });
});

describe("indiceDeMascaras", () => {
  const GENERADO = "2026-10-30T12:00:00.000Z";
  const fila = (cambios: Partial<FilaMascaraConFoto> = {}): FilaMascaraConFoto => ({
    ruta_sm: "mascaras/sm/a.webp",
    fuente_generado_en: GENERADO,
    generado_en: "2026-11-03T00:00:00.000Z",
    foto: { variante_id: "v1", ruta: "x/a.jpg", derivados: { generado_en: GENERADO } },
    ...cambios,
  });

  it("indexa por variante y ruta", () => {
    const indice = indiceDeMascaras([fila()]);
    expect(indice[claveFoto("v1", "x/a.jpg")]).toEqual({
      ruta: "mascaras/sm/a.webp",
      generado_en: "2026-11-03T00:00:00.000Z",
    });
  });

  it("una máscara vencida no entra: esa foto se ve original", () => {
    const vencida = fila({ fuente_generado_en: "2026-01-01T00:00:00.000Z" });
    expect(indiceDeMascaras([vencida])).toEqual({});
  });

  it("tolera una fila sin foto o una foto sin derivados", () => {
    expect(indiceDeMascaras([fila({ foto: null })])).toEqual({});
    expect(
      indiceDeMascaras([fila({ foto: { variante_id: "v1", ruta: "x/a.jpg", derivados: null } })])
    ).toEqual({});
  });
});

describe("mascaraDe", () => {
  const mascara = { ruta: "mascaras/sm/a.webp", generado_en: "2026-11-03T00:00:00.000Z" };
  const indice = { [claveFoto("v1", "x/a.jpg")]: mascara };

  it("encuentra la máscara de esa foto exacta", () => {
    expect(mascaraDe(indice, "v1", "x/a.jpg")).toEqual(mascara);
  });

  it("no le presta la máscara a otra foto ni a otra variante", () => {
    expect(mascaraDe(indice, "v1", "x/b.jpg")).toBeNull();
    expect(mascaraDe(indice, "v2", "x/a.jpg")).toBeNull();
  });

  it("sin ruta no hay máscara", () => {
    expect(mascaraDe(indice, "v1", null)).toBeNull();
  });
});

describe("conMascaras", () => {
  const mascara = { ruta: "mascaras/sm/a.webp", generado_en: "2026-11-03T00:00:00.000Z" };
  const fila = { variante_id: "v1", foto_principal: "x/a.jpg", nombre: "Flor" };

  it("sin máscaras devuelve las mismas filas, como si esto no existiera", () => {
    const filas = [fila];
    expect(conMascaras(filas, {})).toBe(filas);
  });

  it("agrega la máscara de la foto principal y conserva lo demás", () => {
    const [r] = conMascaras([fila], { [claveFoto("v1", "x/a.jpg")]: mascara });
    expect(r).toEqual({ ...fila, foto_principal_mascara: mascara });
  });

  it("una fila sin máscara o sin foto queda en null", () => {
    const indice = { [claveFoto("v9", "x/a.jpg")]: mascara };
    const [a, b] = conMascaras([fila, { ...fila, foto_principal: null }], indice);
    expect(a.foto_principal_mascara).toBeNull();
    expect(b.foto_principal_mascara).toBeNull();
  });
});

describe("estadoDeMascara", () => {
  const G = "2026-10-30T12:00:00.000Z";
  const base = { activa: false, revisada_en: null, fuente_generado_en: G };

  it("una foto nueva está sin revisar", () => {
    expect(estadoDeMascara(base, G)).toBe("sin-revisar");
  });

  it("apagada después de revisarla está excluida", () => {
    expect(estadoDeMascara({ ...base, revisada_en: G }, G)).toBe("excluida");
  });

  it("encendida está activa", () => {
    expect(estadoDeMascara({ ...base, activa: true }, G)).toBe("activa");
  });

  it("si la foto se reprocesó está vencida, sin importar cómo estaba", () => {
    expect(estadoDeMascara({ ...base, activa: true }, "2026-11-01T00:00:00.000Z")).toBe("vencida");
  });
});
