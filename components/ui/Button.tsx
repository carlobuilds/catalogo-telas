import { forwardRef } from "react";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "whatsapp" | "secondary" | "ghost" | "amber";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded font-bold " +
  "transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none cursor-pointer";

const variants: Record<Variant, string> = {
  primary:
    "bg-heritage-navy text-white shadow-sm hover:bg-deep-slate hover:shadow-md focus-visible:ring-heritage-navy",
  amber:
    "bg-amber text-white shadow-sm hover:bg-amber-soft hover:shadow-md focus-visible:ring-amber",
  whatsapp:
    "bg-whatsapp text-white shadow-sm hover:bg-whatsapp-dark hover:shadow-md focus-visible:ring-whatsapp",
  secondary:
    "border border-outline-variant/40 bg-surface-container-lowest text-ink-display shadow-xs hover:bg-surface-container hover:border-outline focus-visible:ring-heritage-navy",
  ghost:
    "text-ink-soft hover:bg-surface-container hover:text-ink-display focus-visible:ring-heritage-navy",
};

/**
 * Ni el más chico baja de 44px de alto (el mínimo táctil de Apple/WCAG 2.5.5)
 * ni de 14px de texto: el catálogo lo usan sobre todo personas de 40+, en el
 * celular y con la tienda abierta. El texto va en tamaño de lectura, no en
 * mayúsculas espaciadas: se lee más rápido y no "grita".
 */
const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-6 text-base",
  lg: "min-h-14 px-8 text-lg",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", fullWidth, children, className, ...rest },
    ref
  ) {
    const classes = cx(
      base,
      variants[variant],
      sizes[size],
      fullWidth && "w-full",
      className
    );

    if ("href" in rest && rest.href !== undefined) {
      const { href, ...anchorRest } = rest as ButtonAsAnchor;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          {...anchorRest}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        {...(rest as ButtonAsButton)}
      >
        {children}
      </button>
    );
  }
);

