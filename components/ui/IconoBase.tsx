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
 *   uno. Aquí viajan bold y fill, y duotone solo en el icono que lo pide.
 * - Un barrel que ENVUELVE iconos es un solo módulo, y webpack no parte un
 *   módulo entre páginas: la portada cargaba los 40 iconos de todo el sitio,
 *   incluidos los del curador de fotos de /admin. El barrel generado solo
 *   re-exporta, y así webpack lo atraviesa y cada página carga los suyos.
 *
 * La política visual se aplica aquí, una vez:
 * - Peso `bold` por defecto. El `regular` de Phosphor traza 1.5px a 24px, más
 *   fino que el lucide que reemplazó (2px); para quien tiene 40+ y ve la
 *   pantalla de una tablet a medio brazo, un icono delgado se pierde.
 * - `fill` para estados ACTIVOS (pestaña actual, filtro puesto, portada) — se
 *   pasa explícito: `<Star weight="fill" />`. Todos los iconos lo traen porque
 *   suele decidirse en tiempo de ejecución (`activa ? "fill" : "bold"`).
 * - `duotone` solo en ilustraciones de estados vacíos (40px o más), y solo
 *   los iconos que lo declaran en el generador lo traen. Pedírselo a otro es
 *   error de TypeScript, no un icono en blanco.
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
export interface IconProps<P extends Peso = "bold" | "fill">
  extends ComponentPropsWithoutRef<"svg">,
    RefAttributes<SVGSVGElement> {
  alt?: string;
  color?: string;
  size?: string | number;
  weight?: P;
  mirrored?: boolean;
}

/**
 * Una firma de función y no `ForwardRefExoticComponent`: así un icono con
 * duotone sigue cabiendo donde se espera un `Icon` a secas (bold/fill).
 */
export type Icon<P extends Peso = "bold" | "fill"> = {
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
