import type { Metadata } from "next";
import type { ReactNode } from "react";
import { exigirAdmin } from "@/lib/admin-auth";
import { ShellAdmin } from "@/components/admin/ShellAdmin";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Todo lo que está en `(panel)` lleva el menú del admin. El login queda FUERA
 * del grupo a propósito: sin sesión no hay menú que mostrar, y meterlo aquí
 * haría que `exigirAdmin` lo mandara a sí mismo.
 */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { email } = await exigirAdmin();
  return <ShellAdmin email={email}>{children}</ShellAdmin>;
}
