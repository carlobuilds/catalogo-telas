import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/admin-auth";
import { MarcoGuia } from "@/components/admin/guias/MarcoGuia";
import { guiaPorSlug } from "@/lib/guias";

type Props = { params: Promise<{ guia: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guia = guiaPorSlug((await params).guia);
  return { title: guia ? guia.titulo : "Guía" };
}

export default async function PaginaGuia({ params }: Props) {
  await exigirAdmin();
  const guia = guiaPorSlug((await params).guia);
  if (!guia) notFound();
  return <MarcoGuia guia={guia} />;
}
