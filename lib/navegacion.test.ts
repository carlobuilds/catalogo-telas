import { describe, expect, it, vi } from "vitest";
import { navegarSinSalto, prepararSinSalto } from "./navegacion";

function routerFalso() {
  const llamadas: string[] = [];
  return {
    llamadas,
    prefetch: vi.fn((href: string) => void llamadas.push(`prefetch ${href}`)),
    push: vi.fn((href: string) => void llamadas.push(`push ${href}`)),
    replace: vi.fn((href: string) => void llamadas.push(`replace ${href}`)),
  };
}

describe("navegarSinSalto", () => {
  it("precarga la URL EXACTA antes de navegar (eso es lo que evita el salto)", () => {
    const r = routerFalso();
    navegarSinSalto(r, "/?ver=96");
    expect(r.llamadas).toEqual(["prefetch /?ver=96", "push /?ver=96"]);
  });

  it("siempre navega con scroll: false", () => {
    const r = routerFalso();
    navegarSinSalto(r, "/tela/gema?color=rojo", { reemplazar: true });
    expect(r.replace).toHaveBeenCalledWith("/tela/gema?color=rojo", { scroll: false });
    expect(r.push).not.toHaveBeenCalled();
  });

  it("sin `reemplazar` agrega al historial (push)", () => {
    const r = routerFalso();
    navegarSinSalto(r, "/merceria?q=flor");
    expect(r.push).toHaveBeenCalledWith("/merceria?q=flor", { scroll: false });
    expect(r.replace).not.toHaveBeenCalled();
  });
});

describe("prepararSinSalto", () => {
  it("solo precarga: la navegación la hace el <Link>", () => {
    const r = routerFalso();
    prepararSinSalto(r, "/?sec=flores");
    expect(r.llamadas).toEqual(["prefetch /?sec=flores"]);
  });
});
