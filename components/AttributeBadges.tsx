import { Sparkle, Needle, Rainbow, Eye } from "@/components/ui/iconos";

export type Atributos = {
  es_bordado?: boolean;
  es_brillante?: boolean;
  es_traslucida?: boolean;
  es_tornasol?: boolean;
};

const BADGES = [
  { key: "es_bordado", label: "Bordado", Icon: Needle },
  { key: "es_brillante", label: "Brillante", Icon: Sparkle },
  { key: "es_traslucida", label: "Translúcida", Icon: Eye },
  { key: "es_tornasol", label: "Tornasol", Icon: Rainbow },
] as const;

export function AttributeBadges({ atributos }: { atributos: Atributos }) {
  const activos = BADGES.filter((b) => atributos[b.key]);
  if (activos.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {activos.map(({ key, label, Icon }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 rounded border border-outline-variant/30 bg-surface-container-low px-2.5 py-1 text-sm font-semibold text-ink-display shadow-2xs"
        >
          <Icon className="size-4 text-amber" />
          {label}
        </span>
      ))}
    </div>
  );
}

