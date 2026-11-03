import { guiaClientas } from "./clientas";
import { guiaFotos } from "./fotos";
import { guiaPanel } from "./panel";
import { guiaRevision } from "./revision";
import type { Guia } from "./tipos";

export const GUIAS: readonly Guia[] = [guiaPanel, guiaRevision, guiaClientas, guiaFotos];

export function guiaPorSlug(slug: string): Guia | null {
  return GUIAS.find((g) => g.slug === slug) ?? null;
}

export type { Bloque, Captura, Guia } from "./tipos";
