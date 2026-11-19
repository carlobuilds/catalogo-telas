import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const insert = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ insert }) }),
}));

const { POST } = await import("./route");

function peticion(cuerpo: unknown, origen = "https://catalogo-telas.vercel.app") {
  return new Request("https://catalogo-telas.vercel.app/api/evento", {
    method: "POST",
    headers: { origin: origen, host: "catalogo-telas.vercel.app", "content-type": "application/json" },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

const PEDIDO = { tipo: "pedido_whatsapp", ruta: "/telas?q=tul", renglones: 2 };

describe("POST /api/evento", () => {
  beforeEach(() => {
    insert.mockReset();
    insert.mockResolvedValue({ error: null });
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fuera de producción NO escribe (preview y local nunca tocan la base)", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const r = await POST(peticion(PEDIDO));
    expect(r.status).toBe(204);
    expect(insert).not.toHaveBeenCalled();
  });

  it("en producción guarda el evento ya validado, sin querystring", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    await POST(peticion(PEDIDO));
    expect(insert).toHaveBeenCalledWith({ tipo: "pedido_whatsapp", ruta: "/telas", renglones: 2 });
  });

  it("ignora peticiones de otro sitio", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const r = await POST(peticion(PEDIDO, "https://otro.sitio"));
    expect(r.status).toBe(204);
    expect(insert).not.toHaveBeenCalled();
  });

  it("ignora basura y cuerpos enormes", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    await POST(peticion("no es json"));
    await POST(peticion({ tipo: "borrar_todo", ruta: "/" }));
    await POST(peticion({ ...PEDIDO, relleno: "x".repeat(3000) }));
    expect(insert).not.toHaveBeenCalled();
  });

  it("sin la tabla (migración sin correr) responde 204 y no hace ruido", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    insert.mockResolvedValue({ error: { code: "PGRST205", message: "no existe" } });
    const r = await POST(peticion(PEDIDO));
    expect(r.status).toBe(204);
    expect(console.error).not.toHaveBeenCalled();
  });
});
