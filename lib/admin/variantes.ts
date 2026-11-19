/**
 * Cómo se nombra una variante en las pantallas de /admin donde hay que
 * DISTINGUIRLA de sus hermanas (galería de fotos, destinos de "Mover…").
 *
 * Antes solo decía el color —o "SKU x", o "Sin color"—, así que dos variantes
 * sin color o dos tamaños del mismo color salían idénticas y no había forma
 * de saber a cuál se mandaba la foto. Ahora suma la medida y el código:
 * "Plata · 3 cm · SKU FL12".
 */
export function etiquetaVariante({
  colorNombre,
  sku,
  medida,
}: {
  colorNombre?: string | null;
  sku?: string | null;
  medida?: string | null;
}): string {
  const limpio = (t?: string | null) => t?.trim() || null;
  const color = limpio(colorNombre);
  const codigo = limpio(sku);
  const partes = [
    color ?? (codigo ? null : "Sin color"),
    limpio(medida),
    codigo ? `SKU ${codigo}` : null,
  ];
  return partes.filter(Boolean).join(" · ");
}
