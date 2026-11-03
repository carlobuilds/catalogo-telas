import { describe, expect, it } from "vitest";
import { ATAJOS, accionDeTecla, teclaDe, type TeclaPulsada } from "./atajos";

const tecla = (key: string, mods: Partial<TeclaPulsada> = {}): TeclaPulsada => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe("accionDeTecla", () => {
  it("las teclas F de SICAR", () => {
    expect(accionDeTecla(tecla("F2"), false)).toBe("nuevo");
    expect(accionDeTecla(tecla("F3"), false)).toBe("buscar");
    expect(accionDeTecla(tecla("F4"), false)).toBe("entradas");
    expect(accionDeTecla(tecla("F9"), false)).toBe("guardar-otro");
    expect(accionDeTecla(tecla("F10"), false)).toBe("guardar");
  });

  it("las teclas F funcionan aunque el foco esté en un campo", () => {
    expect(accionDeTecla(tecla("F10"), true)).toBe("guardar");
    expect(accionDeTecla(tecla("F2"), true)).toBe("nuevo");
  });

  it("Ctrl+S y ⌘+S guardan, también con mayúsculas activadas", () => {
    expect(accionDeTecla(tecla("s", { ctrlKey: true }), true)).toBe("guardar");
    expect(accionDeTecla(tecla("s", { metaKey: true }), false)).toBe("guardar");
    expect(accionDeTecla(tecla("S", { ctrlKey: true }), false)).toBe("guardar");
  });

  it("nunca dispara con Alt (AltGr = Ctrl+Alt al escribir @ en Windows)", () => {
    expect(accionDeTecla(tecla("s", { ctrlKey: true, altKey: true }), true)).toBeNull();
    expect(accionDeTecla(tecla("F2", { altKey: true }), false)).toBeNull();
  });

  it("evita F1, F5, F11 y F12 (son del navegador)", () => {
    for (const f of ["F1", "F5", "F11", "F12"]) expect(accionDeTecla(tecla(f), false)).toBeNull();
  });

  it("una F con modificador es otra cosa (Ctrl+F4 cierra la pestaña)", () => {
    expect(accionDeTecla(tecla("F4", { ctrlKey: true }), false)).toBeNull();
    expect(accionDeTecla(tecla("F2", { shiftKey: true }), false)).toBeNull();
  });

  it("? abre la ayuda solo si no se está escribiendo", () => {
    expect(accionDeTecla(tecla("?", { shiftKey: true }), false)).toBe("ayuda");
    expect(accionDeTecla(tecla("?", { shiftKey: true }), true)).toBeNull();
  });

  it("Esc cancela; letras sueltas no hacen nada", () => {
    expect(accionDeTecla(tecla("Escape"), true)).toBe("cancelar");
    expect(accionDeTecla(tecla("a"), false)).toBeNull();
    expect(accionDeTecla(tecla("Enter"), false)).toBeNull();
    expect(accionDeTecla(tecla("c", { ctrlKey: true }), false)).toBeNull();
  });
});

describe("ATAJOS", () => {
  it("cada acción aparece una sola vez", () => {
    const acciones = ATAJOS.map((a) => a.accion);
    expect(new Set(acciones).size).toBe(acciones.length);
  });

  it("toda tecla F de la ayuda la reconoce accionDeTecla", () => {
    for (const atajo of ATAJOS) {
      for (const t of atajo.teclas.filter((t) => /^F\d+$/.test(t))) {
        expect(accionDeTecla(tecla(t), false)).toBe(atajo.accion);
      }
    }
  });

  it("teclaDe da la tecla principal", () => {
    expect(teclaDe("nuevo")).toBe("F2");
    expect(teclaDe("guardar")).toBe("F10");
  });
});
