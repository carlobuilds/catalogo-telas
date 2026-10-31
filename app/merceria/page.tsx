import type { Metadata } from "next";
import { PaginaCatalogo, type ParamsCatalogo } from "@/components/PaginaCatalogo";
import { rutaDeCatalogo } from "@/lib/catalogos";
import { metadataDeVista } from "@/lib/metadata-vista";

const BASE: Metadata = {
  title: "Mercería — Telas La Jalisciense",
  description:
    "Cristalería, pedrería, encajes, flores y todo lo de costura en Fresnillo. Cotiza por WhatsApp.",
  // Mientras Mercería sea la portada, `/` y `/merceria` pintan lo mismo.
  alternates: { canonical: rutaDeCatalogo("merceria") },
};

/** Con filtros, el título y la foto de la vista previa describen la selección. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ParamsCatalogo>;
}): Promise<Metadata> {
  return metadataDeVista("merceria", await searchParams, BASE);
}

export default async function MerceriaPage({
  searchParams,
}: {
  searchParams: Promise<ParamsCatalogo>;
}) {
  return <PaginaCatalogo catalogo="merceria" searchParams={await searchParams} />;
}
