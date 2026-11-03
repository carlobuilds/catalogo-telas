import Link from "next/link";
import { BotonImprimir } from "@/components/admin/guias/BotonImprimir";
import type { Bloque, Captura, Guia } from "@/lib/guias";

/** `[[Etiqueta]]` sale en negritas: es lo que la persona busca en la pantalla. */
function Texto({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\[\[.+?\]\])/).map((parte, i) =>
        parte.startsWith("[[") ? (
          <strong key={i} className="font-bold text-ink-display print:text-black">
            {parte.slice(2, -2)}
          </strong>
        ) : (
          parte
        )
      )}
    </>
  );
}

function ImagenCaptura({ captura }: { captura: Captura }) {
  return (
    <figure
      className={`break-inside-avoid ${
        // En papel van más chicas: una captura grande empuja a la siguiente página y
        // deja media hoja en blanco, y lo que hay que leer está en los pasos.
        captura.angosta ? "max-w-[15rem] print:max-w-[10.5rem]" : "max-w-xl print:max-w-[24rem]"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- captura estática para imprimir: debe estar completa antes de abrir el diálogo de impresión */}
      <img
        src={`/guias/${captura.archivo}`}
        alt={captura.alt}
        className="w-full rounded border border-line print:border-black/40"
      />
      {captura.pie && (
        <figcaption className="mt-1 text-sm text-ink-soft print:text-[11pt] print:text-black">
          {captura.pie}
        </figcaption>
      )}
    </figure>
  );
}

function SeccionGuia({ bloque }: { bloque: Bloque }) {
  return (
    <section className="mt-8 print:mt-6">
      <h2 className="break-after-avoid text-xl font-bold text-ink-display print:text-[16pt] print:text-black">
        {bloque.titulo}
      </h2>
      {bloque.intro && <p className="mt-2 break-inside-avoid">{bloque.intro}</p>}
      {bloque.pasos && (
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          {bloque.pasos.map((paso) => (
            <li key={paso} className="break-inside-avoid pl-1">
              <Texto texto={paso} />
            </li>
          ))}
        </ol>
      )}
      {bloque.notas && (
        <ul className="mt-3 list-disc space-y-2 pl-6">
          {bloque.notas.map((nota) => (
            <li key={nota} className="break-inside-avoid pl-1">
              <Texto texto={nota} />
            </li>
          ))}
        </ul>
      )}
      {bloque.capturas && (
        <div className="mt-4 flex flex-wrap gap-4">
          {bloque.capturas.map((c) => (
            <ImagenCaptura key={c.archivo} captura={c} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Una guía, igual en pantalla y en papel. En papel no depende del color: los fondos
 * no se imprimen por defecto, y puede salir en blanco y negro.
 */
export function MarcoGuia({ guia }: { guia: Guia }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-base leading-relaxed text-ink-text sm:px-6 lg:px-8 print:max-w-none print:p-0 print:text-[12pt] print:leading-snug print:text-black">
      <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/admin/guias"
          className="inline-flex min-h-11 items-center rounded border border-line bg-surface-container-lowest px-4 text-base font-semibold text-ink-display hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy"
        >
          Todas las guías
        </Link>
        <BotonImprimir />
      </nav>

      <header className="border-b border-line pb-4 print:border-black/40">
        <p className="text-sm font-semibold text-amber print:text-[11pt] print:text-black">
          Telas La Jalisciense · {guia.paraQuien}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-display print:text-[22pt] print:text-black">
          {guia.titulo}
        </h1>
        <p className="mt-2">{guia.resumen}</p>
        {guia.direccion && (
          <p className="mt-3 text-xl font-bold text-ink-display print:text-[15pt] print:text-black">
            {guia.direccion}
          </p>
        )}
      </header>

      {guia.bloques.map((bloque) => (
        <SeccionGuia key={bloque.titulo} bloque={bloque} />
      ))}
    </main>
  );
}
