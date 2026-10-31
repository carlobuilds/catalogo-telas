import type { Metadata } from "next";
import { PaginaCatalogo, type ParamsCatalogo } from "@/components/PaginaCatalogo";
import { rutaDeCatalogo } from "@/lib/catalogos";
import { metadataDeVista } from "@/lib/metadata-vista";

const BASE: Metadata = {
  title: "Telas — Telas La Jalisciense",
  description: "Tul, chifón y tul bordado en Fresnillo. Elige tus metros y cotiza por WhatsApp.",
  alternates: { canonical: rutaDeCatalogo("telas") },
};

/** Con filtros, el título y la foto de la vista previa describen la selección. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ParamsCatalogo>;
}): Promise<Metadata> {
  return metadataDeVista("telas", await searchParams, BASE);
}

export default async function TelasPage({
  searchParams,
}: {
  searchParams: Promise<ParamsCatalogo>;
}) {
  return <PaginaCatalogo catalogo="telas" searchParams={await searchParams} />;
}
