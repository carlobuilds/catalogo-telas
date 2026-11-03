import { describe, it, expect } from "vitest";
import { activaSegunFecha, esContenedor, mascaraVigente } from "./fondo-blanco";

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
