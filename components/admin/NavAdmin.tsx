"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowSquareOut, Question, SignOut } from "@/components/ui/iconos";
import { logout } from "@/app/admin/actions";
import { teclaDe } from "@/lib/atajos";
import { MODULOS_ADMIN, estaActivo, type ModuloAdmin } from "@/components/admin/modulos";
import { abrirAyudaAtajos } from "@/components/admin/AtajosAdmin";

/**
 * Menú del admin. En PC y tablet horizontal (≥1024px) es una barra lateral
 * fija, como el menú de módulos de SICAR; en tablet vertical y celular es una
 * fila de botones bajo el título que se desliza de lado.
 *
 * Las teclas (F2, F4) solo se pintan con mouse/trackpad (`pointer-fine`): en
 * una tablet sin teclado serían ruido que no se puede usar.
 */
export function NavAdmin({ email }: { email: string }) {
  const pathname = usePathname() ?? "";

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="border-b border-line px-5 py-5">
          <p className="text-sm font-semibold text-amber">Telas La Jalisciense</p>
          <p className="text-xl font-bold text-ink-display">Administración</p>
        </div>

        <nav aria-label="Módulos del admin" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {MODULOS_ADMIN.map((m) => (
              <li key={m.href}>
                <EnlaceModulo modulo={m} activo={estaActivo(m, pathname)} variante="lateral" />
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-1 border-t border-line p-3">
          <VerCatalogo variante="lateral" />
          <button
            type="button"
            onClick={abrirAyudaAtajos}
            className={`${CLASE_LATERAL} hidden text-ink-display hover:bg-surface-container pointer-fine:flex`}
          >
            <Question className="size-6 shrink-0 text-amber" />
            Atajos de teclado
            <Tecla>?</Tecla>
          </button>
          <Salir variante="lateral" />
          <p className="break-all px-3 pt-2 text-sm text-ink-soft">{email}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber">Telas La Jalisciense</p>
            <p className="text-lg font-bold leading-tight text-ink-display">Administración</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <VerCatalogo variante="superior" />
            <Salir variante="superior" />
          </div>
        </div>
        <nav aria-label="Módulos del admin" className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">
          {MODULOS_ADMIN.map((m) => (
            <EnlaceModulo key={m.href} modulo={m} activo={estaActivo(m, pathname)} variante="superior" />
          ))}
        </nav>
      </header>
    </>
  );
}

type Variante = "lateral" | "superior";

const CLASE_LATERAL =
  "flex min-h-12 w-full items-center gap-3 rounded px-3 text-left text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy";
const CLASE_SUPERIOR =
  "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy sm:text-base";
const CLASE_ICONO_SUPERIOR =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded px-2 text-sm font-semibold text-ink-display transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heritage-navy";

function EnlaceModulo({
  modulo: { href, etiqueta, Icono, atajo },
  activo,
  variante,
}: {
  modulo: ModuloAdmin;
  activo: boolean;
  variante: Variante;
}) {
  const color = activo
    ? "bg-heritage-navy text-white"
    : variante === "lateral"
      ? "text-ink-display hover:bg-surface-container"
      : "border border-line bg-surface-container-lowest text-ink-display hover:bg-surface-container";

  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`${variante === "lateral" ? CLASE_LATERAL : CLASE_SUPERIOR} ${color}`}
    >
      <Icono className={`${variante === "lateral" ? "size-6" : "size-5"} shrink-0`} />
      {etiqueta}
      {atajo && variante === "lateral" && <Tecla activo={activo}>{teclaDe(atajo)}</Tecla>}
    </Link>
  );
}

function VerCatalogo({ variante }: { variante: Variante }) {
  return (
    <Link
      href="/"
      target="_blank"
      className={
        variante === "lateral"
          ? `${CLASE_LATERAL} text-ink-display hover:bg-surface-container`
          : CLASE_ICONO_SUPERIOR
      }
    >
      <ArrowSquareOut className={`${variante === "lateral" ? "size-6" : "size-5"} shrink-0`} />
      {/* max-sm:sr-only: en celular solo se ve el icono, pero el nombre se sigue leyendo. */}
      <span className={variante === "lateral" ? "" : "max-sm:sr-only"}>Ver catálogo</span>
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </Link>
  );
}

function Salir({ variante }: { variante: Variante }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={
          variante === "lateral"
            ? `${CLASE_LATERAL} text-ink-display hover:bg-surface-container`
            : CLASE_ICONO_SUPERIOR
        }
      >
        <SignOut className={`${variante === "lateral" ? "size-6" : "size-5"} shrink-0`} />
        <span className={variante === "lateral" ? "" : "max-sm:sr-only"}>Salir</span>
      </button>
    </form>
  );
}

function Tecla({ children, activo = false }: { children: string; activo?: boolean }) {
  return (
    <kbd
      className={`ml-auto hidden rounded border px-1.5 font-sans text-sm font-semibold pointer-fine:inline ${
        activo ? "border-white/50 text-white" : "border-line bg-surface-container-lowest text-ink-soft"
      }`}
    >
      {children}
    </kbd>
  );
}
