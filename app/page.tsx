import { PaginaCatalogo, type ParamsCatalogo } from "@/components/PaginaCatalogo";
import { CATALOGO_PORTADA } from "@/lib/catalogos";

/** La portada pinta el catálogo de `CATALOGO_PORTADA` (hoy, Mercería). */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<ParamsCatalogo>;
}) {
  return <PaginaCatalogo catalogo={CATALOGO_PORTADA} searchParams={await searchParams} />;
}
