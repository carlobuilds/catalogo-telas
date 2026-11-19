import { describe, it, expect } from "vitest";
import { armarEventoPedido, lunesDe, resumirPorSemana, soloRuta, validarEvento } from "./metricas";
import type { CartItem } from "./store";

const item = (o: Partial<CartItem> = {}): CartItem => ({
  id: "v1",
  tela_nombre: "Botón BO12",
  color_nombre: "Oro",
  sku: "BO12",
  precio: 10,
  cantidad: 3,
  foto_principal: null,
  unidad_venta: "pieza",
  ...o,
});

describe("armarEventoPedido — qué se guarda de un pedido", () => {
  it("renglones, total con precios reales y sin datos de los productos", () => {
    const e = armarEventoPedido([item(), item({ id: "v2", precio: 2.5, cantidad: 4 })], "/tela/boton-bo12?color=oro");
    expect(e).toEqual({
      tipo: "pedido_whatsapp",
      ruta: "/tela/boton-bo12",
      renglones: 2,
      total_estimado: 40,
      hay_sin_precio: false,
    });
    expect(JSON.stringify(e)).not.toMatch(/BO12|Oro|Botón/);
  });

  it("un artículo sin precio no entra al total y marca hay_sin_precio", () => {
    const e = armarEventoPedido([item(), item({ id: "v2", precio: null })], "/");
    expect(e).toMatchObject({ renglones: 2, total_estimado: 30, hay_sin_precio: true });
  });

  it("un precio de referencia (demo) NO cuenta como dinero real", () => {
    const e = armarEventoPedido([item({ precio: 99, precio_referencia: true })], "/");
    expect(e).toMatchObject({ renglones: 1, total_estimado: null, hay_sin_precio: true });
  });

  it("sin ningún precio real, el total queda vacío y no en $0", () => {
    expect(armarEventoPedido([item({ precio: null })], "/").total_estimado).toBeNull();
  });

  it("lo que arma pasa la validación del servidor tal cual", () => {
    const e = armarEventoPedido([item({ cantidad: 1.5, precio: 33.333 })], "/telas");
    expect(validarEvento(JSON.parse(JSON.stringify(e)))).toEqual(e);
  });
});

describe("validarEvento — lo que llega por la red", () => {
  it("acepta un pedido válido y deja solo la ruta, sin querystring", () => {
    expect(
      validarEvento({ tipo: "pedido_whatsapp", ruta: "/telas?q=tul&color=rojo", renglones: 3, total_estimado: 120.456, hay_sin_precio: true })
    ).toEqual({ tipo: "pedido_whatsapp", ruta: "/telas", renglones: 3, total_estimado: 120.46, hay_sin_precio: true });
  });

  it("rechaza tipos que no existen, rutas raras y basura", () => {
    expect(validarEvento({ tipo: "borrar_todo", ruta: "/" })).toBeNull();
    expect(validarEvento({ tipo: "pedido_whatsapp", ruta: "https://otro.sitio" })).toBeNull();
    expect(validarEvento(null)).toBeNull();
    expect(validarEvento("pedido")).toBeNull();
  });

  it("descarta números fuera de tope en vez de guardarlos", () => {
    const e = validarEvento({ tipo: "pedido_whatsapp", ruta: "/", renglones: 99999, total_estimado: -5 });
    expect(e).toEqual({ tipo: "pedido_whatsapp", ruta: "/" });
  });

  it("un evento de compartir no guarda datos de pedido aunque lleguen", () => {
    expect(validarEvento({ tipo: "compartir_vista", ruta: "/?sec=flores", renglones: 4 })).toEqual({
      tipo: "compartir_vista",
      ruta: "/",
    });
  });

  it("recorta rutas larguísimas al tope de la columna", () => {
    expect(validarEvento({ tipo: "compartir_catalogo", ruta: "/" + "a".repeat(400) })?.ruta).toHaveLength(300);
  });
});

describe("soloRuta", () => {
  it("quita querystring y fragmento", () => {
    expect(soloRuta("/tela/boton-bo12?color=oro#fotos")).toBe("/tela/boton-bo12");
    expect(soloRuta("?q=x")).toBe("/");
  });
});

describe("resumen por semana (hora de Fresnillo, UTC−6)", () => {
  it("el lunes de la semana de un evento", () => {
    // Miércoles 2026-11-18 a mediodía en Fresnillo.
    expect(lunesDe("2026-11-18T18:00:00Z")).toBe("2026-11-16");
  });

  it("un pedido del domingo en la noche cuenta en ESA semana, no en la siguiente", () => {
    // Domingo 2026-11-22 a las 23:00 en Fresnillo = lunes 05:00 UTC.
    expect(lunesDe("2026-11-23T05:00:00Z")).toBe("2026-11-16");
  });

  it("agrupa pedidos y compartidos, la semana más reciente primero", () => {
    const filas = resumirPorSemana([
      { creado_en: "2026-11-10T18:00:00Z", tipo: "pedido_whatsapp", total_estimado: 100 },
      { creado_en: "2026-11-18T18:00:00Z", tipo: "pedido_whatsapp", total_estimado: null },
      { creado_en: "2026-11-18T19:00:00Z", tipo: "compartir_vista", total_estimado: null },
      { creado_en: "2026-11-19T19:00:00Z", tipo: "pedido_whatsapp", total_estimado: 50.5 },
    ]);
    expect(filas).toEqual([
      { semana: "2026-11-16", pedidos: 2, compartidos: 1, totalEstimado: 50.5 },
      { semana: "2026-11-09", pedidos: 1, compartidos: 0, totalEstimado: 100 },
    ]);
  });
});
