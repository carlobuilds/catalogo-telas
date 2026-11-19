import { exigirAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EncabezadoPagina } from "@/components/admin/EncabezadoPagina";
import { esTablaFaltante } from "@/lib/categorias-extra";
import { resumirPorSemana, type FilaEvento } from "@/lib/metricas";
import { pesos } from "@/lib/whatsapp-message";

export const metadata = { title: "Uso del catálogo — Telas La Jalisciense" };

const TAM_PAGINA = 1000;
const DIAS = 90;

/**
 * Cifras del contador (sección 18 del SQL): pedidos enviados por WhatsApp y
 * links compartidos, por semana. Fuera del menú, como Fondos y Guías: es para
 * los reportes de Carlo. Solo lectura.
 */
export default async function UsoPage() {
  // El layout no vuelve a correr en navegaciones parciales.
  await exigirAdmin();
  const supabase = createAdminClient();
  const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000).toISOString();

  const eventos: FilaEvento[] = [];
  let errorLectura: { code?: string; message: string } | null = null;
  for (let inicio = 0; ; inicio += TAM_PAGINA) {
    const { data, error } = await supabase
      .from("evento_catalogo")
      .select("creado_en,tipo,total_estimado")
      .gte("creado_en", desde)
      .order("id")
      .range(inicio, inicio + TAM_PAGINA - 1);
    if (error) {
      errorLectura = error;
      break;
    }
    eventos.push(...((data ?? []) as FilaEvento[]));
    if ((data ?? []).length < TAM_PAGINA) break;
  }

  if (errorLectura) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <EncabezadoPagina titulo="Uso del catálogo" />
        <p role="alert" className="rounded-lg border border-line bg-surface-container-lowest p-4 text-base text-ink-text">
          {esTablaFaltante(errorLectura.code)
            ? "El contador todavía no está activado: falta correr la migración sql/2026-11-19-eventos.sql."
            : `No se pudieron leer las cifras: ${errorLectura.message}`}
        </p>
      </main>
    );
  }

  const semanas = resumirPorSemana(eventos);
  const pedidos = semanas.reduce((n, s) => n + s.pedidos, 0);
  const compartidos = semanas.reduce((n, s) => n + s.compartidos, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <EncabezadoPagina titulo="Uso del catálogo" />
      <p className="mb-6 text-base text-ink-soft">
        Últimos {DIAS} días. Cuenta cada vez que alguien toca &ldquo;Enviar pedido por WhatsApp&rdquo; o
        comparte el catálogo; no guarda quién fue ni qué pidió. Tocar el botón no garantiza que el
        mensaje se haya enviado.
      </p>

      <dl className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-surface p-4">
          <dt className="text-sm text-ink-soft">Pedidos por WhatsApp</dt>
          <dd className="text-3xl font-bold text-amber">{pedidos}</dd>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <dt className="text-sm text-ink-soft">Veces compartido</dt>
          <dd className="text-3xl font-bold text-amber">{compartidos}</dd>
        </div>
      </dl>

      {semanas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-base text-ink-soft">
          Todavía no hay movimientos.
        </p>
      ) : (
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b border-line text-left text-sm text-ink-soft">
              <th className="py-2 pr-3 font-semibold">Semana del</th>
              <th className="py-2 pr-3 text-right font-semibold">Pedidos</th>
              <th className="py-2 pr-3 text-right font-semibold">Compartido</th>
              <th className="py-2 text-right font-semibold">Total estimado</th>
            </tr>
          </thead>
          <tbody>
            {semanas.map((s) => (
              <tr key={s.semana} className="border-b border-line/60">
                <td className="py-2 pr-3">{fechaCorta(s.semana)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{s.pedidos}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{s.compartidos}</td>
                <td className="py-2 text-right tabular-nums">
                  {s.totalEstimado > 0 ? pesos.format(s.totalEstimado) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

/** "2026-11-16" → "16 nov 2026". */
function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`)
  );
}
