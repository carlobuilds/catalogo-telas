import { describe, expect, it } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Iconos from "@/components/ui/iconos";

type Props = Record<string, unknown>;
const html = (C: unknown, props: Props = {}) => renderToStaticMarkup(createElement(C as ComponentType<Props>, props));
const interior = (svg: string) => svg.replace(/^<svg[^>]*>|<\/svg>$/g, "");

const nombres = Object.keys(Iconos).sort();

async function phosphor(nombre: string): Promise<unknown> {
  const modulo = await import(`@phosphor-icons/react/dist/ssr/${nombre}`);
  return modulo[`${nombre}Icon`];
}

describe("iconos generados vs Phosphor", () => {
  it("exporta los 57 iconos del sitio", () => {
    expect(nombres).toHaveLength(57);
  });

  // Si se actualiza @phosphor-icons/react y cambia algún trazo, esto falla:
  // toca volver a correr `pnpm iconos`.
  it.each(nombres)("%s dibuja bold y fill exactamente como Phosphor", async (nombre) => {
    const original = await phosphor(nombre);
    const nuestro = Iconos[nombre as keyof typeof Iconos];
    for (const weight of ["bold", "fill"]) {
      expect(interior(html(nuestro, { weight }))).toBe(interior(html(original, { weight })));
    }
  });

  it.each(nombres)("%s: duotone es el de Phosphor o, si no se generó, cae a bold", async (nombre) => {
    const original = await phosphor(nombre);
    const nuestro = Iconos[nombre as keyof typeof Iconos];
    const duotono = interior(html(nuestro, { weight: "duotone" }));
    expect([interior(html(original, { weight: "duotone" })), interior(html(nuestro))]).toContain(duotono);
  });

  it("MagnifyingGlass trae duotone de verdad (estado vacío de la portada)", async () => {
    const original = await phosphor("MagnifyingGlass");
    expect(interior(html(Iconos.MagnifyingGlass, { weight: "duotone" }))).toBe(
      interior(html(original, { weight: "duotone" })),
    );
    expect(html(Iconos.MagnifyingGlass, { weight: "duotone" })).toContain('opacity="0.2"');
  });
});

describe("política de iconos", () => {
  it("bold por defecto", () => {
    expect(html(Iconos.Star)).toBe(html(Iconos.Star, { weight: "bold" }));
    expect(html(Iconos.Star)).not.toBe(html(Iconos.Star, { weight: "fill" }));
  });

  it("decorativo por defecto: aria-hidden y fuera del orden de foco", () => {
    const svg = html(Iconos.Trash, { className: "size-5" });
    expect(svg).toMatch(/^<svg [^>]*aria-hidden="true"/);
    expect(svg).toContain('focusable="false"');
    expect(svg).toContain('class="size-5"');
    expect(svg).not.toContain("role=");
  });

  it("con aria-label deja de ser invisible", () => {
    const svg = html(Iconos.X, { "aria-label": "Cerrar" });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Cerrar"');
    expect(svg).not.toContain("aria-hidden");
  });

  it("con alt lleva <title>, como Phosphor", () => {
    const svg = html(Iconos.Warning, { alt: "Atención" });
    expect(svg).toContain("<title>Atención</title>");
    expect(svg).toContain('role="img"');
  });

  it("las props del que llama ganan (aria-hidden explícito, tamaño, color, espejo)", async () => {
    const svg = html(Iconos.ArrowRight, { "aria-hidden": false, size: 32, color: "red", mirrored: true });
    expect(svg).toContain('aria-hidden="false"');
    const original = html(await phosphor("ArrowRight"), { size: 32, color: "red", mirrored: true, weight: "bold" });
    for (const attr of ['width="32"', 'height="32"', 'fill="red"', 'transform="scale(-1, 1)"']) {
      expect(original).toContain(attr);
      expect(svg).toContain(attr);
    }
  });
});
