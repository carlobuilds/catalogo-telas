import { estadoDeMascara, type EstadoMascara, type MascaraFoto } from "@/lib/fondo-blanco";
import type { DerivadosFoto } from "@/lib/types";

/** Una foto con máscara, tal como la ve la pantalla de revisión. */
export type FichaFondo = {
  fotoId: string;
  ruta: string;
  derivados: DerivadosFoto | null;
  mascara: MascaraFoto;
  estado: EstadoMascara;
  nombre: string;
  telaId: string | null;
  pctTransicion: number;
};

/** Forma de la lectura de `foto_mascara` con su foto, variante y tela. */
export type FilaFondo = {
  foto_id: string;
  ruta_sm: string;
  activa: boolean;
  revisada_en: string | null;
  fuente_generado_en: string;
  generado_en: string;
  pct_transicion: number;
  foto: {
    ruta: string;
    derivados: DerivadosFoto | null;
    variante: {
      color: { nombre: string } | null;
      tela: { id: string; nombre: string } | null;
    } | null;
  } | null;
};

/**
 * Convierte las filas en fichas, con las más dudosas primero: mucha transición es
 * señal de pieza oscura o transparente, y son las que conviene revisar antes de
 * prender el interruptor.
 */
export function fichasDeFondos(filas: FilaFondo[]): FichaFondo[] {
  return filas
    .filter((f) => f.foto)
    .map((f) => ({
      fotoId: f.foto_id,
      ruta: f.foto!.ruta,
      derivados: f.foto!.derivados,
      mascara: { ruta: f.ruta_sm, generado_en: f.generado_en },
      estado: estadoDeMascara(f, f.foto!.derivados?.generado_en),
      nombre: [f.foto!.variante?.tela?.nombre ?? f.foto!.ruta, f.foto!.variante?.color?.nombre]
        .filter(Boolean)
        .join(" · "),
      telaId: f.foto!.variante?.tela?.id ?? null,
      pctTransicion: f.pct_transicion,
    }))
    .sort((a, b) => b.pctTransicion - a.pctTransicion);
}

export type FiltroFondos = "todas" | EstadoMascara;

export const FILTROS_FONDOS: { valor: FiltroFondos; etiqueta: string }[] = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "sin-revisar", etiqueta: "Nuevas sin revisar" },
  { valor: "activa", etiqueta: "Encendidas" },
  { valor: "excluida", etiqueta: "Apagadas" },
  { valor: "vencida", etiqueta: "Foto cambiada" },
];

export function leerFiltroFondos(valor: string | string[] | undefined): FiltroFondos {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return FILTROS_FONDOS.some((f) => f.valor === v) ? (v as FiltroFondos) : "todas";
}

export function contarPorFiltro(fichas: FichaFondo[]): Record<FiltroFondos, number> {
  const conteo: Record<FiltroFondos, number> = {
    todas: fichas.length,
    "sin-revisar": 0,
    activa: 0,
    excluida: 0,
    vencida: 0,
  };
  for (const f of fichas) conteo[f.estado]++;
  return conteo;
}

export function filtrarFichas(fichas: FichaFondo[], filtro: FiltroFondos): FichaFondo[] {
  return filtro === "todas" ? fichas : fichas.filter((f) => f.estado === filtro);
}
