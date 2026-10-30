import type { Metadata } from "next";
import { PaginaCatalogo, type ParamsCatalogo } from "@/components/PaginaCatalogo";
import { rutaDeCatalogo } from "@/lib/catalogos";

export const metadata: Metadata = {
  title: "Mercería — Telas La Jalisciense",
  description:
    "Cristalería, pedrería, encajes, flores y todo lo de costura en Fresnillo. Cotiza por WhatsApp.",
  // Mientras Mercería sea la portada, `/` y `/merceria` pintan lo mismo.
  alternates: { canonical: rutaDeCatalogo("merceria") },
};

export default async function MerceriaPage({
  searchParams,
}: {
  searchParams: Promise<ParamsCatalogo>;
}) {
  return <PaginaCatalogo catalogo="merceria" searchParams={await searchParams} />;
}
