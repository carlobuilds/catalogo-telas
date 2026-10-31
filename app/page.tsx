import type { Metadata } from "next";
import { PaginaCatalogo, type ParamsCatalogo } from "@/components/PaginaCatalogo";
import { CATALOGO_PORTADA } from "@/lib/catalogos";
import { metadataDeVista } from "@/lib/metadata-vista";

/** Sin filtros, la metadata del layout; con filtros, la vista previa de la selección. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ParamsCatalogo>;
}): Promise<Metadata> {
  return metadataDeVista(CATALOGO_PORTADA, await searchParams, {});
}

/** La portada pinta el catálogo de `CATALOGO_PORTADA` (hoy, Mercería). */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<ParamsCatalogo>;
}) {
  return <PaginaCatalogo catalogo={CATALOGO_PORTADA} searchParams={await searchParams} />;
}
