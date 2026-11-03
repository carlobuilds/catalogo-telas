import { describe, expect, it } from "vitest";
import { esRutaInterna } from "./rutas";

describe("esRutaInterna", () => {
  it("admin y revisión, con y sin subrutas", () => {
    for (const ruta of ["/admin", "/admin/", "/admin/login", "/admin/tela/123", "/revision", "/revision/producto/9"]) {
      expect(esRutaInterna(ruta)).toBe(true);
    }
  });

  it("la vitrina no es interna, aunque un slug empiece igual", () => {
    for (const ruta of ["/", "/tela/admin-encaje", "/inspiracion", "/administracion", "/revisiones"]) {
      expect(esRutaInterna(ruta)).toBe(false);
    }
  });

  it("sin ruta todavía (primer render) se trata como vitrina", () => {
    expect(esRutaInterna(null)).toBe(false);
  });
});
