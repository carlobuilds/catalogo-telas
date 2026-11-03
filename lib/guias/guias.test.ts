import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { MODULOS_ADMIN } from "@/components/admin/modulos";
import { GUIAS, guiaPorSlug } from "./index";

const RAIZ = process.cwd();

function textoDe(g: (typeof GUIAS)[number]): string {
  return g.bloques.flatMap((b) => [b.titulo, b.intro ?? "", ...(b.pasos ?? []), ...(b.notas ?? [])]).join("\n");
}

function archivosDe(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivosDe(ruta);
    return /\.tsx?$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : [];
  });
}

/** Todo el código de las pantallas, sin las guías: si está aquí, alguien lo puede ver. */
const CODIGO = ["app", "components", "lib"]
  .flatMap((d) => archivosDe(join(RAIZ, d)))
  .filter((f) => !f.includes(join("lib", "guias")))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

describe("guías de uso", () => {
  it("cada guía se encuentra por su slug", () => {
    for (const g of GUIAS) expect(guiaPorSlug(g.slug)).toBe(g);
    expect(guiaPorSlug("inventada")).toBeNull();
  });

  it("toda etiqueta citada existe de verdad en las pantallas", () => {
    const faltantes: string[] = [];
    for (const g of GUIAS) {
      for (const [, etiqueta] of textoDe(g).matchAll(/\[\[(.+?)\]\]/g)) {
        if (!CODIGO.includes(etiqueta)) faltantes.push(`${g.slug}: ${etiqueta}`);
      }
    }
    expect(faltantes).toEqual([]);
  });

  it("la guía del panel nombra todos los módulos del menú", () => {
    const panel = textoDe(guiaPorSlug("panel")!);
    for (const m of MODULOS_ADMIN) expect(panel).toContain(`[[${m.etiqueta}]]`);
  });

  it("toda captura citada existe y tiene texto alternativo", () => {
    for (const g of GUIAS) {
      for (const c of g.bloques.flatMap((b) => b.capturas ?? [])) {
        expect(existsSync(join(RAIZ, "public", "guias", c.archivo)), c.archivo).toBe(true);
        expect(c.alt.length).toBeGreaterThan(10);
      }
    }
  });

  it("no promete teclas que no funcionan", () => {
    const panel = textoDe(guiaPorSlug("panel")!);
    expect(panel).not.toMatch(/\bF9\b/);
    expect(panel).not.toMatch(/\bEsc\b/);
  });

  it("no dice metros como si todo se vendiera así", () => {
    for (const g of GUIAS) expect(textoDe(g)).not.toMatch(/Cantidad \(m\)|tus metros/);
  });
});
