/**
 * Base de los iconos del sitio — trazos de Phosphor (https://phosphoricons.com).
 * ===========================================================================
 * Los iconos se importan SOLO de `@/components/ui/iconos`, igual que
 * `lib/unidades.ts` es el único vocabulario de unidades. Esa carpeta la genera
 * `pnpm iconos` (`scripts/generar-iconos.ts`): un módulo por icono con nada
 * más que los `d` de sus paths, dibujados por el `crearIcono` de aquí.
 *
 * Por qué no se importa `@phosphor-icons/react` directo (medido con
 * `pnpm build`, la portada pasó de 120 a 146 kB de JS):
 * - Cada icono de Phosphor trae los SEIS pesos (thin…duotone) aunque se dibuje
 *   uno. Aquí viaja bold, y fill o duotone solo en los iconos que los usan.
 * - Un barrel que ENVUELVE iconos es un solo módulo, y webpack no parte un
 *   módulo entre páginas: la portada cargaba los 40 iconos de todo el sitio,
 *   incluidos los del curador de fotos de /admin. El barrel generado solo
 *   re-exporta, y así webpack lo atraviesa y cada página carga los suyos.
 *
 * La política visual se aplica aquí, una vez:
 * - Peso `bold` por defecto. El `regular` de Phosphor traza 1.5px a 24px, más
 *   fino que el lucide que reemplazó (2px); para quien tiene 40+ y ve la
 *   pantalla de una tablet a medio brazo, un icono delgado se pierde.
 * - `fill` para estados ACTIVOS (pestaña actual, filtro puesto) — se pasa
 *   explícito: `<CheckCircle weight="fill" />`.
 * - `duotone` solo en ilustraciones de estados vacíos (40px o más).
 * - fill y duotone los traen únicamente los iconos que los declaran en el
 *   generador (`CON_FILL`, `CON_DUOTONO`). Pedírselos a otro es error de
 *   TypeScript, no un icono en blanco. Donde el peso se decide en ejecución
 *   (`activa ? "fill" : "bold"`), la prop se tipa `Icon<"bold" | "fill">` y
 *   TypeScript exige que cada icono que se pase traiga fill.
 * - Decorativo por defecto (`aria-hidden`): el texto del botón ya dice qué
 *   hace. Si el icono va SOLO, pásale `aria-label` y deja de ser invisible.
 *
 * Sin hooks ni contexto: el mismo icono sirve en Server y Client Components.
 * El tamaño va con clases (`className="h-5 w-5"` o `size-5`): las clases de
 * Tailwind le ganan al `width/height="1em"` que va de atributo.
 * ===========================================================================
 */
import type { ComponentPropsWithoutRef, ReactNode, RefAttributes } from "react";

export type Peso = "bold" | "fill" | "duotone";

/** El `d` de un `<path>`, o `[d, opacidad]` para la capa tenue del duotone. */
export type Trazo = string | readonly [d: string, opacidad: string];

/** Las mismas props que el `IconProps` de Phosphor, con los pesos que hay. */
export interface IconProps<P extends Peso = "bold">
  extends ComponentPropsWithoutRef<"svg">,
    RefAttributes<SVGSVGElement> {
  alt?: string;
  color?: string;
  size?: string | number;
  weight?: P;
  mirrored?: boolean;
}

/**
 * `Icon` a secas es cualquier icono (todos traen bold). `Icon<"bold" | "fill">`
 * es uno que además sabe rellenarse: ahí solo caben iconos de `CON_FILL`.
 */
export type Icon<P extends Peso = "bold"> = {
  (props: IconProps<P>): ReactNode;
  displayName?: string;
};

export function crearIcono<P extends Peso>(
  nombre: string,
  trazos: { bold: readonly Trazo[] } & Record<P, readonly Trazo[]>,
): Icon<"bold" | P> {
  function Icono({
    ref,
    alt,
    color = "currentColor",
    size = "1em",
    weight = "bold",
    mirrored = false,
    children,
    ...props
  }: IconProps<"bold" | P>) {
    const etiquetado = props["aria-label"] != null || alt != null;
    // `?? bold`: TypeScript ya impide pedir un peso que no se generó; esto
    // solo cubre un `as any`, para que salga un icono y no un hueco.
    const paths = (trazos as Partial<Record<Peso, readonly Trazo[]>>)[weight] ?? trazos.bold;
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        fill={color}
        viewBox="0 0 256 256"
        transform={mirrored ? "scale(-1, 1)" : undefined}
        aria-hidden={etiquetado ? undefined : true}
        role={etiquetado ? "img" : undefined}
        focusable="false"
        {...props}
      >
        {alt ? <title>{alt}</title> : null}
        {children}
        {paths.map((t, i) =>
          typeof t === "string" ? <path key={i} d={t} /> : <path key={i} d={t[0]} opacity={t[1]} />,
        )}
      </svg>
    );
  }
  Icono.displayName = nombre;
  return Icono;
}
