#!/usr/bin/env tsx
/**
 * Iconos — genera components/ui/iconos/ desde Phosphor
 * ===========================================================================
 *   pnpm iconos      → reescribe components/ui/iconos/ (un módulo por icono
 *                      más el index que los re-exporta)
 *
 * Un icono nuevo se agrega a `ICONOS` y se corre `pnpm iconos`. Solo trae
 * bold: si se dibuja relleno (estado activo) va además en `CON_FILL`, y si es
 * de estado vacío, en `CON_DUOTONO`. No hace falta adivinar: pedirle a un
 * icono un peso que no trae es error de TypeScript en el componente que lo
 * pide. Nunca se edita a mano la carpeta: la próxima corrida la tira completa.
 *
 * De dónde salen los trazos: se renderiza el componente SSR de Phosphor (su
 * export público, `@phosphor-icons/react/dist/ssr/<Icono>`) con cada peso y
 * se leen los `<path>` del SVG. Así se copia lo que Phosphor dibuja, no su
 * estructura interna. Si algún día un icono trae algo que no sea `<path d>`
 * (o `opacity` en el duotone), el script truena en vez de perderlo.
 *
 * El porqué de todo esto (pesos y un módulo por icono) está en
 * `components/ui/IconoBase.tsx`. `components/ui/iconos.test.ts` compara cada
 * icono generado contra Phosphor: si se actualiza el paquete y cambia un
 * trazo, la prueba avisa que hay que volver a correr esto.
 * ===========================================================================
 */
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { Peso, Trazo } from "../components/ui/IconoBase";

const ICONOS = [
  "ArrowClockwise",
  "ArrowCounterClockwise",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowSquareOut",
  "ArrowsLeftRight",
  "ArrowsOut",
  "Barricade",
  "Basket",
  "CameraPlus",
  "CaretDown",
  "CaretLeft",
  "CaretRight",
  "Check",
  "CheckCircle",
  "CircleNotch",
  "ClockCounterClockwise",
  "Crop",
  "Diamond",
  "DotsSixVertical",
  "Eye",
  "FunnelX",
  "Gear",
  "GridNine",
  "HandSwipeRight",
  "Image",
  "ImageBroken",
  "LinkSimple",
  "ListChecks",
  "LockSimple",
  "MagnifyingGlass",
  "MagnifyingGlassMinus",
  "MagnifyingGlassPlus",
  "Minus",
  "Needle",
  "PencilRuler",
  "PencilSimple",
  "Printer",
  "Plus",
  "Prohibit",
  "Question",
  "Rainbow",
  "Ruler",
  "SealCheck",
  "ShareNetwork",
  "ShieldWarning",
  "ShoppingBag",
  "SignOut",
  "SlidersHorizontal",
  "Sparkle",
  "SquaresFour",
  "Star",
  "Swatches",
  "Trash",
  "TrendDown",
  "Warehouse",
  "Warning",
  "WhatsappLogo",
  "X",
];

/**
 * Estados activos. Cada fill extra cuesta ~100 bytes comprimidos en cada
 * página que use el icono; por eso no va en todos.
 */
const CON_FILL = new Set([
  "CheckCircle", // filtro "solo disponibles" puesto (CatalogToolbar)
  "Question", // ┐
  "ShoppingBag", // │ pestaña activa de la barra inferior (MobileBottomNav)
  "Sparkle", // │ — también en el hero
  "SquaresFour", // ┘
  "WhatsappLogo", // botones de WhatsApp (HeroSection, CartDrawer)
]);

/** Estados vacíos (app/page.tsx: "sin resultados"). */
const CON_DUOTONO = new Set(["MagnifyingGlass"]);

const DESTINO = path.join(process.cwd(), "components/ui/iconos");
const require = createRequire(path.join(process.cwd(), "package.json"));
const VERSION: string = require("@phosphor-icons/react/package.json").version;
const CABECERA =
  `// Generado por \`pnpm iconos\` (scripts/generar-iconos.ts) desde\n` +
  `// @phosphor-icons/react ${VERSION}. No editar a mano.\n`;

/** Lee los `<path>` que Phosphor dibuja para un peso. */
function trazosDe(Componente: ComponentType<{ weight: Peso }>, nombre: string, peso: Peso): Trazo[] {
  const svg = renderToStaticMarkup(createElement(Componente, { weight: peso }));
  const interior = /^<svg[^>]*>(.*)<\/svg>$/s.exec(svg)?.[1];
  if (interior == null) throw new Error(`${nombre}/${peso}: no salió un <svg>`);

  const trazos: Trazo[] = [];
  const unPath = /<path ([^>]*)><\/path>/y;
  let m: RegExpExecArray | null;
  let leido = 0; // `lastIndex` vuelve a 0 cuando el último exec falla.
  while ((m = unPath.exec(interior))) {
    leido = unPath.lastIndex;
    const attrs = Object.fromEntries([...m[1].matchAll(/([a-z-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    const { d, opacity, ...resto } = attrs;
    if (!d || Object.keys(resto).length > 0) {
      throw new Error(`${nombre}/${peso}: path con atributos que no se copian: ${m[1]}`);
    }
    trazos.push(opacity == null ? d : [d, opacity]);
  }
  if (leido !== interior.length || trazos.length === 0) {
    throw new Error(`${nombre}/${peso}: Phosphor dibuja algo que no es <path>: ${interior}`);
  }
  return trazos;
}

function moduloDe(nombre: string, trazos: Partial<Record<Peso, Trazo[]>>): string {
  const pesos = Object.entries(trazos)
    .map(([peso, lista]) => `  ${peso}: ${JSON.stringify(lista)},`)
    .join("\n");
  return (
    CABECERA +
    `import { crearIcono } from "../IconoBase";\n\n` +
    `export const ${nombre} = /* @__PURE__ */ crearIcono("${nombre}", {\n${pesos}\n});\n`
  );
}

async function main() {
  const repetidos = ICONOS.filter((n, i) => ICONOS.indexOf(n) !== i);
  if (repetidos.length > 0) throw new Error(`Repetidos en ICONOS: ${repetidos.join(", ")}`);
  for (const [lista, nombres] of [["CON_FILL", CON_FILL], ["CON_DUOTONO", CON_DUOTONO]] as const) {
    for (const n of nombres) if (!ICONOS.includes(n)) throw new Error(`${n} está en ${lista} y no en ICONOS`);
  }

  const archivos = new Map<string, string>();
  let bytes = 0;
  for (const nombre of ICONOS) {
    const modulo = await import(`@phosphor-icons/react/dist/ssr/${nombre}`).catch(() => {
      throw new Error(`Phosphor no tiene un icono "${nombre}" — revisa el nombre en phosphoricons.com`);
    });
    const Componente = modulo[`${nombre}Icon`];
    const pesos: Peso[] = [
      "bold",
      ...(CON_FILL.has(nombre) ? (["fill"] as const) : []),
      ...(CON_DUOTONO.has(nombre) ? (["duotone"] as const) : []),
    ];
    const trazos = Object.fromEntries(pesos.map((p) => [p, trazosDe(Componente, nombre, p)]));
    const codigo = moduloDe(nombre, trazos);
    bytes += codigo.length;
    archivos.set(`${nombre}.ts`, codigo);
  }
  archivos.set(
    "index.ts",
    CABECERA +
      `// La lista de iconos vive en el script; la política, en ../IconoBase.tsx.\n` +
      `// Este index SOLO re-exporta: es lo que deja a webpack mandar a cada página\n` +
      `// únicamente los iconos que usa.\n\n` +
      `export type { Icon, IconProps, Peso } from "../IconoBase";\n` +
      ICONOS.map((n) => `export { ${n} } from "./${n}";\n`).join(""),
  );

  // La carpeta es 100% generada: se tira completa para que un icono quitado
  // de la lista no se quede de fantasma.
  await rm(DESTINO, { recursive: true, force: true });
  await mkdir(DESTINO, { recursive: true });
  for (const [archivo, codigo] of archivos) await writeFile(path.join(DESTINO, archivo), codigo);

  console.log(
    `✔ ${ICONOS.length} iconos (${CON_FILL.size} con fill, ${CON_DUOTONO.size} con duotone) en components/ui/iconos/ — ` +
      `${(bytes / 1024).toFixed(1)} kB de fuente, Phosphor ${VERSION}`,
  );
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
