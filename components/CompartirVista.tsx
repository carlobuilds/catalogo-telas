"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { mensajeCompartir } from "@/lib/compartir";

/**
 * "Compartir esta selección": manda la vista filtrada tal cual está, para que
 * quien abra el link vea SOLO eso. Junto al encabezado de resultados, solo
 * cuando hay filtros o búsqueda (el catálogo completo ya lo comparte el header).
 *
 * - Celular: hoja nativa de compartir (WhatsApp, mensajes…).
 * - Sin ella: WhatsApp con el mensaje listo para elegir contacto.
 * - "Copiar enlace": para la vendedora en la tablet, que pega el link en el
 *   chat que ya tiene abierto. Confirma con "¡Copiado!".
 *
 * `ruta` es relativa y ya viene SIN `ver` (lib/compartir.ts → rutaDeVista):
 * la clienta empieza desde arriba, no en la página 3 de quien se lo mandó.
 */
export function CompartirVista({ ruta, descripcion }: { ruta: string; descripcion: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2500);
    return () => clearTimeout(t);
  }, [copiado]);

  const urlCompleta = () => new URL(ruta, window.location.origin).toString();

  const compartir = async () => {
    const url = urlCompleta();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${descripcion} — Telas La Jalisciense`,
          text: `Mira esta selección de Telas La Jalisciense: ${descripcion}`,
          url,
        });
        return;
      } catch (e) {
        // Cancelar la hoja no es un error: no se abre WhatsApp encima.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(mensajeCompartir(descripcion, url))}`, "_blank", "noopener,noreferrer");
  };

  const copiar = async () => {
    const url = urlCompleta();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Sin permiso de portapapeles (http, navegadores viejos): el método
      // antiguo con un textarea temporal.
      const campo = document.createElement("textarea");
      campo.value = url;
      campo.setAttribute("readonly", "");
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="whatsapp" size="md" onClick={compartir} className="min-h-[44px] px-4">
        <Share2 className="h-5 w-5" aria-hidden />
        Compartir esta selección
      </Button>
      <Button variant="secondary" size="md" onClick={copiar} className="min-h-[44px] px-4">
        {copiado ? <Check className="h-5 w-5 text-success" aria-hidden /> : <Link2 className="h-5 w-5" aria-hidden />}
        {copiado ? "¡Copiado!" : "Copiar enlace"}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copiado ? "Enlace copiado" : ""}
      </span>
    </div>
  );
}
