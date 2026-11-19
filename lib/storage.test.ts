import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  baseDeRuta,
  publicImageUrl,
  rutaDerivado,
  rutaMascara,
  rutasDerivados,
  rutasMascara,
  rutasQueSePuedenBorrar,
  srcsetDerivados,
  urlDerivado,
  urlMascara,
} from "./supabase/storage";
import type { DerivadosFoto } from "./types";

const BASE = "https://demo.supabase.co";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE);
});

const derivados: DerivadosFoto = {
  sm: { ruta: "derivados/sm/chifon/azul-1.webp", ancho: 533, alto: 800 },
  md: { ruta: "derivados/md/chifon/azul-1.webp", ancho: 1067, alto: 1600 },
  lg: { ruta: "derivados/lg/chifon/azul-1.webp", ancho: 1600, alto: 2400 },
};

describe("rutaDerivado", () => {
  it("espeja la ruta del original bajo derivados/{tamano} con extensión .webp", () => {
    expect(rutaDerivado("chifon/azul-1.jpg", "md")).toBe(
      "derivados/md/chifon/azul-1.webp"
    );
  });

  it("tolera slash inicial y extensiones variadas", () => {
    expect(rutaDerivado("/tul/negro.PNG", "sm")).toBe("derivados/sm/tul/negro.webp");
  });

  it("genera las tres rutas para el borrado en bloque", () => {
    expect(rutasDerivados("chifon/azul-1.jpg")).toEqual([
      "derivados/sm/chifon/azul-1.webp",
      "derivados/md/chifon/azul-1.webp",
      "derivados/lg/chifon/azul-1.webp",
    ]);
  });
});

describe("srcsetDerivados", () => {
  it("arma el srcset con el ancho real de cada derivado, de menor a mayor", () => {
    expect(srcsetDerivados(derivados)).toBe(
      [
        `${BASE}/storage/v1/object/public/telas/derivados/sm/chifon/azul-1.webp 533w`,
        `${BASE}/storage/v1/object/public/telas/derivados/md/chifon/azul-1.webp 1067w`,
        `${BASE}/storage/v1/object/public/telas/derivados/lg/chifon/azul-1.webp 1600w`,
      ].join(", ")
    );
  });

  it("omite tamaños faltantes (fotos procesadas con estrategias previas)", () => {
    expect(srcsetDerivados({ md: derivados.md })).toBe(
      `${BASE}/storage/v1/object/public/telas/derivados/md/chifon/azul-1.webp 1067w`
    );
  });

  it("devuelve null sin derivados → el componente cae a next/image", () => {
    expect(srcsetDerivados(null)).toBeNull();
    expect(srcsetDerivados(undefined)).toBeNull();
    expect(srcsetDerivados({})).toBeNull();
  });
});

describe("urlDerivado", () => {
  it("devuelve el tamaño preferido si existe", () => {
    expect(urlDerivado(derivados, "md")).toContain("derivados/md/");
  });

  it("cae en cascada a otro tamaño si el preferido falta", () => {
    expect(urlDerivado({ lg: derivados.lg }, "md")).toContain("derivados/lg/");
  });

  it("null si no hay ninguno", () => {
    expect(urlDerivado({}, "md")).toBeNull();
  });
});

describe("publicImageUrl", () => {
  it("construye la URL pública del bucket a partir de la ruta relativa", () => {
    expect(publicImageUrl("chifon/azul-1.jpg")).toBe(
      `${BASE}/storage/v1/object/public/telas/chifon/azul-1.jpg`
    );
  });
});

describe("máscaras de fondo blanco", () => {
  const ID = "3f2a1c9e-0000-4000-8000-000000000001";

  it("viven bajo su propio prefijo y por id de foto", () => {
    expect(rutaMascara(ID, "sm")).toBe(`mascaras/sm/${ID}.webp`);
    expect(rutasMascara(ID)).toEqual([`mascaras/sm/${ID}.webp`, `mascaras/md/${ID}.webp`]);
  });

  it("nunca caen dentro del prefijo de los derivados", () => {
    for (const ruta of rutasMascara(ID)) expect(ruta.startsWith("derivados/")).toBe(false);
  });

  it("la URL lleva el sello de cuándo se generó", () => {
    const generado = "2026-11-03T00:00:00.000Z";
    expect(urlMascara(`mascaras/sm/${ID}.webp`, generado)).toBe(
      `${BASE}/storage/v1/object/public/telas/mascaras/sm/${ID}.webp?v=${Date.parse(generado)}`
    );
  });

  it("sin ruta no hay URL, y sin fecha no hay sello", () => {
    expect(urlMascara(null, "2026-11-03T00:00:00.000Z")).toBeNull();
    expect(urlMascara(`mascaras/sm/${ID}.webp`, null)).toBe(
      `${BASE}/storage/v1/object/public/telas/mascaras/sm/${ID}.webp`
    );
  });
});

describe("rutasQueSePuedenBorrar", () => {
  const A = "11111111-1111-1111-1111-111111111111";
  const B = "22222222-2222-2222-2222-222222222222";
  const todo = (id: string, ruta: string) => [ruta, ...rutasDerivados(ruta), ...rutasMascara(id)];

  it("una foto que no comparte nada se lleva su original, sus 3 derivados y sus 2 máscaras", () => {
    expect(rutasQueSePuedenBorrar([{ id: A, ruta: "flor/rosa.jpg" }], []).sort()).toEqual(
      todo(A, "flor/rosa.jpg").sort()
    );
  });

  it("si otra fila usa la MISMA ruta, el original y los derivados se quedan", () => {
    const rutas = rutasQueSePuedenBorrar([{ id: A, ruta: "flor/rosa.jpg" }], [{ ruta: "flor/rosa.jpg" }]);
    expect(rutas.sort()).toEqual(rutasMascara(A).sort());
  });

  it("borrar el .jpg de una pareja .jpg/.webp conserva los derivados (son los mismos archivos)", () => {
    const rutas = rutasQueSePuedenBorrar([{ id: A, ruta: "flor/rosa.jpg" }], [{ ruta: "flor/rosa.webp" }]);
    expect(rutas).toContain("flor/rosa.jpg");
    for (const d of rutasDerivados("flor/rosa.jpg")) expect(rutas).not.toContain(d);
  });

  it("no confunde nombres parecidos: x-1.jpg no comparte con x.jpg", () => {
    const rutas = rutasQueSePuedenBorrar([{ id: A, ruta: "flor/x.jpg" }], [{ ruta: "flor/x-1.jpg" }]);
    expect(rutas.sort()).toEqual(todo(A, "flor/x.jpg").sort());
  });

  it("la barra inicial no cambia la comparación", () => {
    expect(baseDeRuta("/flor/rosa.jpg")).toBe("flor/rosa");
    const rutas = rutasQueSePuedenBorrar([{ id: A, ruta: "/flor/rosa.jpg" }], [{ ruta: "flor/rosa.jpg" }]);
    expect(rutas.sort()).toEqual(rutasMascara(A).sort());
  });

  it("una variante entera: solo se protege la foto que otra variante comparte", () => {
    const rutas = rutasQueSePuedenBorrar(
      [
        { id: A, ruta: "flor/rosa.jpg" },
        { id: B, ruta: "flor/lila.jpg" },
      ],
      [{ ruta: "flor/lila.jpg" }]
    );
    for (const r of todo(A, "flor/rosa.jpg")) expect(rutas).toContain(r);
    expect(rutas).not.toContain("flor/lila.jpg");
    for (const d of rutasDerivados("flor/lila.jpg")) expect(rutas).not.toContain(d);
    for (const m of rutasMascara(B)) expect(rutas).toContain(m);
  });

  it("dos fotos borradas con la misma ruta no repiten archivos", () => {
    const rutas = rutasQueSePuedenBorrar(
      [
        { id: A, ruta: "flor/rosa.jpg" },
        { id: B, ruta: "flor/rosa.jpg" },
      ],
      []
    );
    expect(new Set(rutas).size).toBe(rutas.length);
  });
});
