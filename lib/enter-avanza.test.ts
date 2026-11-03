import { describe, expect, it } from "vitest";
import { enterAvanzaDesde, siguienteCampo, type CampoDescrito } from "./enter-avanza";

const campo = (etiqueta: string, tipo = "", extra: Partial<CampoDescrito> = {}): CampoDescrito => ({
  etiqueta,
  tipo,
  nombre: "",
  marcado: false,
  deshabilitado: false,
  soloLectura: false,
  visible: true,
  enterPropio: false,
  ...extra,
});

describe("enterAvanzaDesde", () => {
  it("avanza desde campos de una línea y desde select", () => {
    for (const tipo of ["text", "number", "email", "tel", "search", "date", ""]) {
      expect(enterAvanzaDesde(campo("input", tipo))).toBe(true);
    }
    expect(enterAvanzaDesde(campo("select"))).toBe(true);
  });

  it("no toca Enter en textarea, botones, archivos ni casillas", () => {
    expect(enterAvanzaDesde(campo("textarea"))).toBe(false);
    expect(enterAvanzaDesde(campo("button"))).toBe(false);
    expect(enterAvanzaDesde(campo("input", "submit"))).toBe(false);
    expect(enterAvanzaDesde(campo("input", "file"))).toBe(false);
    expect(enterAvanzaDesde(campo("input", "checkbox"))).toBe(false);
  });

  it("respeta data-enter-propio", () => {
    expect(enterAvanzaDesde(campo("input", "text", { enterPropio: true }))).toBe(false);
  });
});

describe("siguienteCampo", () => {
  it("va al siguiente campo y devuelve null en el último", () => {
    const campos = [campo("input", "text"), campo("input", "number"), campo("textarea")];
    expect(siguienteCampo(campos, 0)).toBe(1);
    expect(siguienteCampo(campos, 1)).toBe(2);
    expect(siguienteCampo(campos, 2)).toBeNull();
  });

  it("salta ocultos, deshabilitados, de solo lectura, archivos y botones", () => {
    const campos = [
      campo("input", "text"),
      campo("input", "hidden"),
      campo("input", "text", { deshabilitado: true }),
      campo("input", "text", { soloLectura: true }),
      campo("input", "text", { visible: false }),
      campo("input", "file"),
      campo("button"),
      campo("select"),
    ];
    expect(siguienteCampo(campos, 0)).toBe(7);
  });

  it("de un grupo de radios entra al marcado", () => {
    const campos = [
      campo("input", "text"),
      campo("input", "radio", { nombre: "unidad" }),
      campo("input", "radio", { nombre: "unidad", marcado: true }),
      campo("input", "radio", { nombre: "unidad" }),
      campo("input", "number"),
    ];
    expect(siguienteCampo(campos, 0)).toBe(2);
  });

  it("si ningún radio está marcado entra al primero", () => {
    const campos = [
      campo("input", "text"),
      campo("input", "radio", { nombre: "unidad" }),
      campo("input", "radio", { nombre: "unidad" }),
    ];
    expect(siguienteCampo(campos, 0)).toBe(1);
  });

  it("las casillas sí reciben el foco (Espacio las marca)", () => {
    const campos = [campo("input", "text"), campo("input", "checkbox"), campo("input", "text")];
    expect(siguienteCampo(campos, 0)).toBe(1);
  });
});
