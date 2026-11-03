import {
  SquaresFour,
  Diamond,
  Plus,
  Warehouse,
  ListChecks,
  type Icon,
} from "@/components/ui/iconos";
import type { AccionAtajo } from "@/lib/atajos";

/**
 * Módulos del menú del admin, con el vocabulario de SICAR (Artículos,
 * Entradas y salidas). Lo leen el menú (`NavAdmin`) y los atajos
 * (`AtajosAdmin`), así que F2/F4 y el botón del menú van siempre al mismo
 * lugar.
 *
 * Las dos altas siguen separadas hasta que exista "Nuevo artículo" (una sola
 * pantalla para tela y mercería); mientras, F2 abre la de mercería porque es
 * la que captura un artículo completo de una sentada.
 */
export interface ModuloAdmin {
  href: string;
  etiqueta: string;
  Icono: Icon;
  atajo?: AccionAtajo;
  /** Rutas que también encienden este módulo (el editor es parte de Artículos). */
  activoEn?: (pathname: string) => boolean;
}

export const MODULOS_ADMIN: readonly ModuloAdmin[] = [
  {
    href: "/admin",
    etiqueta: "Artículos",
    Icono: SquaresFour,
    activoEn: (p) => p === "/admin" || (p.startsWith("/admin/tela/") && p !== "/admin/tela/nueva"),
  },
  { href: "/admin/merceria/nueva", etiqueta: "Nueva mercería", Icono: Diamond, atajo: "nuevo" },
  { href: "/admin/tela/nueva", etiqueta: "Nueva tela", Icono: Plus },
  { href: "/admin/inventario", etiqueta: "Entradas y salidas", Icono: Warehouse, atajo: "entradas" },
  { href: "/revision", etiqueta: "Revisión", Icono: ListChecks },
];

export function moduloDeAtajo(accion: AccionAtajo): ModuloAdmin | undefined {
  return MODULOS_ADMIN.find((m) => m.atajo === accion);
}

export function estaActivo(modulo: ModuloAdmin, pathname: string): boolean {
  return modulo.activoEn ? modulo.activoEn(pathname) : pathname === modulo.href;
}
