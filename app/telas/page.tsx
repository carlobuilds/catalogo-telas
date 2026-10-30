import type { Metadata } from "next";
import { PaginaCatalogo, type ParamsCatalogo } from "@/components/PaginaCatalogo";
import { rutaDeCatalogo } from "@/lib/catalogos";

export const metadata: Metadata = {
  title: "Telas — Telas La Jalisciense",
  description: "Tul, chifón y tul bordado en Fresnillo. Elige tus metros y cotiza por WhatsApp.",
  alternates: { canonical: rutaDeCatalogo("telas") },
};

export default async function TelasPage({
  searchParams,
}: {
  searchParams: Promise<ParamsCatalogo>;
}) {
  return <PaginaCatalogo catalogo="telas" searchParams={await searchParams} />;
}
