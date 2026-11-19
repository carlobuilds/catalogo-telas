import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Simula a @supabase/ssr: `getUser()` llama a `setAll` con lo que Supabase
 * quiera escribir (aquí, BORRAR la cookie de una sesión vencida) y devuelve
 * el usuario indicado.
 */
let usuario: { id: string } | null = null;
let cookiesQueEscribe: { name: string; value: string; options: Record<string, unknown> }[] = [];
const creado = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _llave: string, { cookies }: { cookies: { setAll: (c: unknown[]) => void } }) => {
    creado();
    return {
      auth: {
        getUser: async () => {
          if (cookiesQueEscribe.length) cookies.setAll(cookiesQueEscribe);
          return { data: { user: usuario } };
        },
      },
    };
  },
}));

const { updateSession } = await import("./middleware");

const peticion = (ruta: string) => new NextRequest(`https://catalogo-telas.vercel.app${ruta}`);

describe("updateSession", () => {
  beforeEach(() => {
    usuario = null;
    cookiesQueEscribe = [];
    creado.mockClear();
  });

  it("sin sesión, /revision manda a SU login y /admin al suyo", async () => {
    expect((await updateSession(peticion("/revision"))).headers.get("location")).toMatch(/\/revision\/login$/);
    expect((await updateSession(peticion("/admin/tela/1"))).headers.get("location")).toMatch(/\/admin\/login$/);
  });

  it("al redirigir conserva el BORRADO de la cookie vencida (si no, el bucle de login no se arregla solo)", async () => {
    cookiesQueEscribe = [{ name: "sb-proyecto-auth-token", value: "", options: { maxAge: 0 } }];
    const r = await updateSession(peticion("/revision"));
    expect(r.status).toBe(307);
    const cookie = r.cookies.get("sb-proyecto-auth-token");
    expect(cookie?.value).toBe("");
  });

  it("las pantallas de login no pasan por Supabase", async () => {
    const r = await updateSession(peticion("/revision/login"));
    expect(r.headers.get("location")).toBeNull();
    await updateSession(peticion("/admin/login"));
    expect(creado).not.toHaveBeenCalled();
  });

  it("con sesión deja pasar", async () => {
    usuario = { id: "u1" };
    const r = await updateSession(peticion("/admin"));
    expect(r.headers.get("location")).toBeNull();
  });
});
