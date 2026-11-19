import { createAdminClient } from "@/lib/supabase/admin";
import { esTablaFaltante } from "@/lib/categorias-extra";
import { validarEvento } from "@/lib/metricas";

/**
 * POST /api/evento — contador de pedidos por WhatsApp y links compartidos
 * (sección 18 del SQL). Siempre responde 204: el navegador manda esto con
 * `sendBeacon` y nadie espera la respuesta, así que un error nunca llega a la
 * clienta.
 *
 * Reglas:
 * - SOLO escribe en producción (`VERCEL_ENV === "production"`). En el preview
 *   y en local solo lo anota en el log: probar el sitio nunca mete renglones
 *   en la base real.
 * - Solo acepta peticiones del propio sitio (Origin = Host) y cuerpos chicos.
 *   No impide inflar las cifras a propósito, pero sí la basura casual.
 * - Sin la tabla (migración sin correr) no hace nada.
 */
const TOPE_BYTES = 2_000;

/** El host de un Origin; "null" (iframes con sandbox) o basura no son el sitio. */
function hostDe(origen: string): string | null {
  try {
    return new URL(origen).host;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const sinContenido = new Response(null, { status: 204 });

  const origen = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origen && host && hostDe(origen) !== host) return sinContenido;

  const texto = await request.text();
  if (texto.length > TOPE_BYTES) return sinContenido;

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return sinContenido;
  }
  const evento = validarEvento(cuerpo);
  if (!evento) return sinContenido;

  if (process.env.VERCEL_ENV !== "production") {
    console.info("[evento] (fuera de producción, no se guarda)", evento);
    return sinContenido;
  }

  try {
    const { error } = await createAdminClient().from("evento_catalogo").insert(evento);
    if (error && !esTablaFaltante(error.code)) console.error("[evento]", error.message);
  } catch (e) {
    console.error("[evento]", e);
  }
  return sinContenido;
}
