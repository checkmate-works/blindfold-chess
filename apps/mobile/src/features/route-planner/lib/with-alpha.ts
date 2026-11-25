/**
 * A `#rrggbb` theme colour at the given opacity, for the web's `bg-primary/10`
 * style tints. Any other colour string is returned unchanged.
 */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return hex;
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
