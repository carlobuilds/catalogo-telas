"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { prepararSinSalto } from "@/lib/navegacion";

type Props = Omit<ComponentProps<typeof Link>, "scroll" | "href"> & { href: string };

/**
 * `<Link scroll={false}>` que de verdad no hace scroll en producción.
 *
 * Un `<Link>` normal ya precarga, pero para una URL de la MISMA ruta (otro
 * filtro, otra página de "Ver más") su precarga reutiliza la entrada que ya
 * existe y no crea la suya; al tocarlo, la navegación sale "aliased" y Next
 * ignora `scroll={false}`. Justo antes de navegar se precarga la URL exacta
 * (`onNavigate` corre solo en clics normales, no en Ctrl+clic ni "abrir en
 * otra pestaña"). El porqué completo está en `lib/navegacion.ts`.
 */
export function LinkSinSalto({ href, onNavigate, ...props }: Props) {
  const router = useRouter();
  return (
    <Link
      {...props}
      href={href}
      scroll={false}
      onNavigate={(e) => {
        onNavigate?.(e);
        prepararSinSalto(router, href);
      }}
    />
  );
}
