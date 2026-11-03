import { describe, it, expect } from "vitest";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  analizarImagen,
  analizarPixeles,
  codificarMascara,
  generarYGuardarMascara,
  veloRgba,
  type AnalisisMascara,
} from "./mascara";

/**
 * Escenas sintéticas, como en `recorte.test.ts`: geometría conocida permite
 * afirmar qué píxel es fondo y cuál es producto en vez de "se ve bien".
 */
const LADO = 200;

type Pieza = { x0: number; y0: number; x1: number; y1: number; rgb: [number, number, number] };

function escena(
  fondo: (x: number, y: number) => [number, number, number],
  piezas: Pieza[] = [],
  lado = LADO
): Uint8Array {
  const px = new Uint8Array(lado * lado * 3);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const dentro = piezas.find((p) => x >= p.x0 && x < p.x1 && y >= p.y0 && y < p.y1);
      const [r, g, b] = dentro ? dentro.rgb : fondo(x, y);
      const k = (y * lado + x) * 3;
      px[k] = r;
      px[k + 1] = g;
      px[k + 2] = b;
    }
  }
  return px;
}

const NEGRO = (): [number, number, number] => [2, 3, 6];
const PIEZA_CENTRAL: Pieza = { x0: 60, y0: 60, x1: 140, y1: 140, rgb: [220, 210, 200] };

/** Pieza con borde que se desvanece en 12 píxeles, como en una foto real. */
const BORDE_DIFUSO = (x: number, y: number): [number, number, number] => {
  const d = Math.max(Math.abs(x - 100), Math.abs(y - 100));
  const v = d <= 40 ? 220 : d >= 52 ? 4 : Math.round(220 - ((d - 40) / 12) * 216);
  return [v, v, v];
};

function exigeMascara(r: AnalisisMascara) {
  if (!r.aplica) throw new Error(`Esperaba máscara y salió "${r.motivo}"`);
  return r;
}

describe("analizarPixeles", () => {
  it("vuelve fondo lo negro y deja transparente el producto", () => {
    const r = exigeMascara(analizarPixeles(escena(NEGRO, [PIEZA_CENTRAL]), LADO, LADO, 3));
    expect(r.alfa[10 * LADO + 10]).toBe(255); // esquina: velo opaco
    expect(r.alfa[100 * LADO + 100]).toBe(0); // centro de la pieza: se ve la foto
  });

  it("sin contorno negro: el velo cubre el fondo hasta tocar la pieza", () => {
    const r = exigeMascara(analizarPixeles(escena(NEGRO, [PIEZA_CENTRAL]), LADO, LADO, 3));
    // Sin afinar, el blur dejaría el velo abierto sobre negro desde x=57.
    for (const x of [50, 55, 57, 58]) expect(r.alfa[100 * LADO + x]).toBe(255);
    expect(r.alfa[100 * LADO + 62]).toBe(0);
  });

  it("una faceta oscura rodeada de piedra no se vuelve blanca", () => {
    const faceta: Pieza = { x0: 98, y0: 98, x1: 102, y1: 102, rgb: [8, 8, 8] };
    const r = exigeMascara(analizarPixeles(escena(NEGRO, [faceta, PIEZA_CENTRAL]), LADO, LADO, 3));
    expect(r.alfa[100 * LADO + 100]).toBe(0);
  });

  it("transición suave en un borde difuso, como los de una foto real", () => {
    const r = exigeMascara(analizarPixeles(escena(BORDE_DIFUSO), LADO, LADO, 3));
    const fila = Array.from({ length: 16 }, (_, i) => r.alfa[100 * LADO + 44 + i]);
    expect(fila.some((a) => a > 0 && a < 255)).toBe(true);
    for (let i = 1; i < fila.length; i++) expect(fila[i]).toBeLessThanOrEqual(fila[i - 1]);
  });

  it("limpia los huecos de una pieza calada, no solo el exterior", () => {
    // Marco con ventana negra en el centro: un flood fill desde la orilla la dejaría negra.
    const color: [number, number, number] = [200, 200, 200];
    const marco: Pieza[] = [
      { x0: 50, y0: 50, x1: 150, y1: 70, rgb: color },
      { x0: 50, y0: 130, x1: 150, y1: 150, rgb: color },
      { x0: 50, y0: 50, x1: 70, y1: 150, rgb: color },
      { x0: 130, y0: 50, x1: 150, y1: 150, rgb: color },
    ];
    const r = exigeMascara(analizarPixeles(escena(NEGRO, marco), LADO, LADO, 3));
    expect(r.alfa[100 * LADO + 100]).toBe(255);
    expect(r.alfa[60 * LADO + 100]).toBe(0);
  });

  it("el umbral se adapta al ruido de cada foto: un fondo a 20 no deja manchas", () => {
    // Bloques de compresión: el fondo alterna entre 4 y 20, como en las tomas reales.
    const ruidoso = (x: number, y: number): [number, number, number] => {
      const v = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 4 : 20;
      return [v, v, v];
    };
    const r = exigeMascara(analizarPixeles(escena(ruidoso, [PIEZA_CENTRAL]), LADO, LADO, 3));
    const fuera = r.alfa.filter((_, i) => {
      const x = i % LADO;
      const y = Math.floor(i / LADO);
      return x < 40 || x >= 160 || y < 40 || y >= 160;
    });
    expect(Math.min(...fuera)).toBe(255);
    expect(r.nivelFondo).toBeGreaterThan(4);
  });

  it("sin neblina: el centro más iluminado que la orilla también se vuelve fondo", () => {
    // Orilla a 3 y centro a 14, sin escalón: la orilla sola subestimaría el fondo.
    const conLuz = (x: number, y: number): [number, number, number] => {
      const d = Math.hypot(x - LADO / 2, y - LADO / 2) / (LADO / 2);
      const v = Math.round(Math.max(3, 14 - 11 * d));
      return [v, v, v];
    };
    const pieza: Pieza = { x0: 85, y0: 85, x1: 115, y1: 115, rgb: [220, 210, 200] };
    const r = exigeMascara(analizarPixeles(escena(conLuz, [pieza]), LADO, LADO, 3));
    expect(r.alfa[70 * LADO + 100]).toBe(255); // junto a la pieza, donde más brilla el fondo
    expect(r.alfa[100 * LADO + 100]).toBe(0);
  });

  it("no lava un producto oscuro: la transición se angosta con la foto", () => {
    // Con un tramo fijo de 22, este brillo quedaría a medio velo y casi blanco.
    const fondo = (): [number, number, number] => [6, 6, 8];
    const flor: Pieza = { ...PIEZA_CENTRAL, rgb: [30, 12, 18] };
    const r = exigeMascara(analizarPixeles(escena(fondo, [flor]), LADO, LADO, 3));
    expect(r.alfa[100 * LADO + 100]).toBe(0);
    expect(r.alfa[10 * LADO + 10]).toBe(255);
  });

  it("reporta qué tanto de la foto queda en transición", () => {
    const r = exigeMascara(analizarPixeles(escena(BORDE_DIFUSO), LADO, LADO, 3));
    expect(r.pctTransicion).toBeGreaterThan(0);
    expect(r.pctTransicion).toBeLessThan(15);
  });

  it("una tira que cruza el marco no descalifica la foto", () => {
    // Producto en la orilla izquierda y derecha: dispara el percentil alto, no el p90.
    const tira: Pieza = { x0: 0, y0: 90, x1: LADO, y1: 110, rgb: [220, 210, 200] };
    const r = exigeMascara(analizarPixeles(escena(NEGRO, [tira]), LADO, LADO, 3));
    expect(r.alfa[100 * LADO + 100]).toBe(0);
    expect(r.alfa[20 * LADO + 100]).toBe(255);
    expect(r.nivelFondo).toBeLessThan(40);
  });

  it("usa max(r,g,b): un azul rey oscuro no se confunde con el fondo", () => {
    const azul: Pieza = { ...PIEZA_CENTRAL, rgb: [9, 44, 95] }; // medido: mariposa #092C5F
    const r = exigeMascara(analizarPixeles(escena(NEGRO, [azul]), LADO, LADO, 3));
    expect(r.alfa[100 * LADO + 100]).toBe(0);
  });

  it("no aplica si la foto no está sobre negro", () => {
    const gris = (): [number, number, number] => [171, 165, 163];
    const r = analizarPixeles(escena(gris, [PIEZA_CENTRAL]), LADO, LADO, 3);
    expect(r).toMatchObject({ aplica: false, motivo: "fondo-no-negro" });
  });

  it("no aplica si el producto es casi invisible: saldría un cuadro blanco", () => {
    const negroSobreNegro: Pieza = { ...PIEZA_CENTRAL, rgb: [6, 6, 8] };
    const r = analizarPixeles(escena(NEGRO, [negroSobreNegro]), LADO, LADO, 3);
    expect(r).toMatchObject({ aplica: false, motivo: "sin-producto" });
  });

  it("no aplica si el producto llena la foto: es una tela oscura a cuadro completo", () => {
    // La orilla negra pasa el filtro de nivel, pero casi todo lo demás es "producto".
    const tela: Pieza = { x0: 8, y0: 8, x1: 192, y1: 192, rgb: [60, 60, 70] };
    const r = analizarPixeles(escena(NEGRO, [tela]), LADO, LADO, 3);
    expect(r).toMatchObject({ aplica: false, motivo: "producto-demasiado-grande" });
  });

  it("no aplica a un producto oscuro y mate: saldría deshecho", () => {
    // Fondo a 24 y flor que apenas llega a 40: las sombras se confunden con el fondo.
    const fondoAlto = (): [number, number, number] => [20, 22, 24];
    const flor: Pieza = { ...PIEZA_CENTRAL, rgb: [40, 18, 26] };
    const r = analizarPixeles(escena(fondoAlto, [flor]), LADO, LADO, 3);
    expect(r).toMatchObject({ aplica: false, motivo: "producto-oscuro" });
  });

  it("borra las motas de polvo de la tela negra", () => {
    const mota: Pieza = { x0: 10, y0: 10, x1: 12, y1: 12, rgb: [200, 200, 200] };
    const r = exigeMascara(analizarPixeles(escena(NEGRO, [PIEZA_CENTRAL, mota], 800), 800, 800, 3));
    expect(r.alfa[11 * 800 + 11]).toBe(255);
    expect(r.alfa[100 * 800 + 100]).toBe(0);
  });

  it("en un contenedor conserva el interior: lo negro se ve a través del vidrio", () => {
    // Aro brillante con el centro negro, como un cuenco visto desde arriba.
    const aro: Pieza[] = [
      { x0: 50, y0: 50, x1: 150, y1: 60, rgb: [200, 200, 200] },
      { x0: 50, y0: 140, x1: 150, y1: 150, rgb: [200, 200, 200] },
      { x0: 50, y0: 50, x1: 60, y1: 150, rgb: [200, 200, 200] },
      { x0: 140, y0: 50, x1: 150, y1: 150, rgb: [200, 200, 200] },
    ];
    const px = escena(NEGRO, aro);
    const normal = exigeMascara(analizarPixeles(px, LADO, LADO, 3));
    const cuenco = exigeMascara(analizarPixeles(px, LADO, LADO, 3, { contenedor: true }));
    expect(normal.alfa[100 * LADO + 100]).toBe(255); // pieza calada: se limpia
    expect(cuenco.alfa[100 * LADO + 100]).toBe(0); // cuenco: se conserva
    expect(cuenco.alfa[10 * LADO + 10]).toBe(255); // afuera sigue siendo fondo
  });

  it("la envolvente de un contenedor no se estira hacia una mota de polvo", () => {
    const mota: Pieza = { x0: 700, y0: 700, x1: 702, y1: 702, rgb: [200, 200, 200] };
    const caja: Pieza = { x0: 300, y0: 300, x1: 500, y1: 500, rgb: [200, 200, 200] };
    const r = exigeMascara(
      analizarPixeles(escena(NEGRO, [caja, mota], 800), 800, 800, 3, { contenedor: true })
    );
    expect(r.alfa[600 * 800 + 600]).toBe(255);
  });

  it("es determinista: la misma foto da la misma máscara", () => {
    const px = escena(NEGRO, [PIEZA_CENTRAL]);
    const a = exigeMascara(analizarPixeles(px, LADO, LADO, 3));
    const b = exigeMascara(analizarPixeles(px, LADO, LADO, 3));
    expect(Buffer.from(a.alfa).equals(Buffer.from(b.alfa))).toBe(true);
  });

  it("no modifica los píxeles de entrada", () => {
    const px = escena(NEGRO, [PIEZA_CENTRAL]);
    const copia = Uint8Array.from(px);
    analizarPixeles(px, LADO, LADO, 3);
    expect(Buffer.from(px).equals(Buffer.from(copia))).toBe(true);
  });
});

describe("analizarImagen", () => {
  it("analiza bytes reales y conserva la geometría de una foto no cuadrada", async () => {
    const bytes = await sharp({
      create: { width: 400, height: 200, channels: 3, background: { r: 2, g: 3, b: 6 } },
    })
      .composite([
        {
          input: {
            create: { width: 60, height: 60, channels: 3, background: { r: 220, g: 210, b: 200 } },
          },
          left: 170,
          top: 70,
        },
      ])
      .webp({ quality: 90 })
      .toBuffer();
    const r = exigeMascara(await analizarImagen(bytes));
    expect([r.ancho, r.alto]).toEqual([400, 200]);
    expect(r.alfa[100 * 400 + 200]).toBe(0);
    expect(r.alfa[10 * 400 + 10]).toBe(255);
  });

  it("no agranda una foto chica", async () => {
    const bytes = await sharp(escena(NEGRO, [PIEZA_CENTRAL]), {
      raw: { width: LADO, height: LADO, channels: 3 },
    })
      .png()
      .toBuffer();
    const r = exigeMascara(await analizarImagen(bytes));
    expect(r.ancho).toBe(LADO);
  });
});

describe("veloRgba", () => {
  it("el color es blanco constante y solo cambia el alfa", () => {
    const rgba = veloRgba(Uint8Array.from([255, 128, 0]));
    expect(Array.from(rgba)).toEqual([255, 255, 255, 255, 255, 255, 255, 128, 255, 255, 255, 0]);
  });
});

describe("codificarMascara", () => {
  it("conserva el producto transparente y el fondo opaco", async () => {
    const r = exigeMascara(analizarPixeles(escena(NEGRO, [PIEZA_CENTRAL]), LADO, LADO, 3));
    const { buffer, ancho, alto } = await codificarMascara(r.alfa, r.ancho, r.alto);
    const alfa = await sharp(buffer).ensureAlpha().extractChannel(3).raw().toBuffer();
    expect(alfa[Math.floor(alto / 2) * ancho + Math.floor(ancho / 2)]).toBeLessThan(10);
    expect(alfa[5 * ancho + 5]).toBeGreaterThan(245);
  });

  it("rechaza una máscara opaca: sería un cuadro blanco sobre el producto", async () => {
    const opaca = new Uint8Array(LADO * LADO).fill(255);
    await expect(codificarMascara(opaca, LADO, LADO)).rejects.toThrow(/opaca/);
  });
});

/**
 * Cliente falso que registra todo lo que se le pide. Las pruebas de abajo fijan
 * la promesa del módulo: nunca escribir en `foto` ni fuera de `mascaras/`.
 */
function clienteFalso(bytes: Buffer) {
  const tablas: string[] = [];
  const subidas: string[] = [];
  const escrituras: { tipo: string; datos: Record<string, unknown> }[] = [];
  const bajadas: string[] = [];
  const cliente = {
    storage: {
      from: () => ({
        download: async (ruta: string) => {
          bajadas.push(ruta);
          return { data: new Blob([new Uint8Array(bytes)]), error: null };
        },
        upload: async (ruta: string) => {
          subidas.push(ruta);
          return { error: null };
        },
      }),
    },
    from: (tabla: string) => {
      tablas.push(tabla);
      return {
        upsert: async (datos: Record<string, unknown>) => {
          escrituras.push({ tipo: "upsert", datos });
          return { error: null };
        },
        update: (datos: Record<string, unknown>) => ({
          eq: async () => {
            escrituras.push({ tipo: "update", datos });
            return { error: null };
          },
        }),
      };
    },
  };
  return { cliente: cliente as unknown as SupabaseClient, tablas, subidas, escrituras, bajadas };
}

describe("generarYGuardarMascara", () => {
  const FOTO = "3f2a1c9e-0000-4000-8000-000000000001";
  const GENERADO = "2026-10-30T12:00:00.000Z";
  const derivados = {
    sm: { ruta: "derivados/sm/x/y.webp", ancho: LADO, alto: LADO },
    generado_en: GENERADO,
  };
  const webp = (px: Uint8Array) =>
    sharp(px, { raw: { width: LADO, height: LADO, channels: 3 } }).webp({ quality: 95 }).toBuffer();

  it("solo escribe en foto_mascara y bajo mascaras/, y sale del derivado sm", async () => {
    const f = clienteFalso(await webp(escena(NEGRO, [PIEZA_CENTRAL])));
    const r = await generarYGuardarMascara(f.cliente, { fotoId: FOTO, derivados, activa: false });
    expect(r.estado).toBe("guardada");
    expect(f.tablas).toEqual(["foto_mascara"]);
    expect(f.subidas).toEqual([`mascaras/sm/${FOTO}.webp`]);
    expect(f.bajadas).toEqual(["derivados/sm/x/y.webp"]);
  });

  it("registra si entra encendida y de qué derivados salió", async () => {
    const f = clienteFalso(await webp(escena(NEGRO, [PIEZA_CENTRAL])));
    await generarYGuardarMascara(f.cliente, { fotoId: FOTO, derivados, activa: true });
    expect(f.escrituras[0].tipo).toBe("upsert");
    expect(f.escrituras[0].datos).toMatchObject({
      foto_id: FOTO, activa: true, fuente_generado_en: GENERADO,
    });
  });

  it("al regenerar conserva lo que la tienda decidió: no manda `activa`", async () => {
    const f = clienteFalso(await webp(escena(NEGRO, [PIEZA_CENTRAL])));
    await generarYGuardarMascara(f.cliente, { fotoId: FOTO, derivados, activa: true, reemplazar: true });
    expect(f.escrituras[0].tipo).toBe("update");
    expect(f.escrituras[0].datos).not.toHaveProperty("activa");
  });

  it("si la foto no aplica no escribe nada", async () => {
    const gris = (): [number, number, number] => [171, 165, 163];
    const f = clienteFalso(await webp(escena(gris, [PIEZA_CENTRAL])));
    const r = await generarYGuardarMascara(f.cliente, { fotoId: FOTO, derivados, activa: true });
    expect(r).toEqual({ estado: "no-aplica", motivo: "fondo-no-negro" });
    expect(f.subidas).toEqual([]);
    expect(f.tablas).toEqual([]);
  });

  it("sin derivados no hace nada: generarlos escribiría en `foto`", async () => {
    const f = clienteFalso(Buffer.alloc(0));
    const r = await generarYGuardarMascara(f.cliente, { fotoId: FOTO, derivados: null, activa: true });
    expect(r).toEqual({ estado: "sin-derivados" });
    expect(f.bajadas).toEqual([]);
    expect(f.subidas).toEqual([]);
  });
});
