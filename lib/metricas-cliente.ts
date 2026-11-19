import type { EventoCatalogo } from "@/lib/metricas";

/**
 * Manda un evento al contador sin estorbar: `sendBeacon` lo entrega aunque la
 * página se vaya a WhatsApp en ese instante, y no hay nada que esperar. Si el
 * navegador no lo soporta o algo falla, se pierde ESE conteo y ya: el pedido
 * de la clienta nunca depende de esto.
 */
export function registrarEvento(evento: EventoCatalogo): void {
  try {
    const cuerpo = JSON.stringify(evento);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/evento", new Blob([cuerpo], { type: "application/json" }));
      return;
    }
    void fetch("/api/evento", {
      method: "POST",
      body: cuerpo,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Contar es lo de menos.
  }
}
