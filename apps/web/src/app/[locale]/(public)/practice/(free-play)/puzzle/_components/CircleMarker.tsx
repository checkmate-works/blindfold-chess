import type { ReactElement } from 'react';

import type { PieceColor } from '@blindfold-chess/types';

type Props = {
  color: PieceColor;
  /** Tailwind size utility pair for the outer span; defaults to `h-3 w-3`. */
  sizeClass?: string;
  className?: string;
};

/**
 * Small solid/outlined disc used as a side-to-move indicator in chip lists
 * and the opponent-status PageTitle slot.
 *
 * We render a plain `<span>` with Tailwind utilities instead of the Unicode
 * circle emojis `⚪` / `⚫`. Emoji rendering is font- and OS-dependent and
 * the "white" glyph is often drawn as an outlined ring whose interior is
 * *transparent* — so it picks up the surrounding background (destructive in
 * dark mode or over any non-white panel). A real `<span>` with explicit
 * fill / border colors from the design tokens is the cheapest fix and keeps
 * the light/dark palette in sync automatically.
 */
export function CircleMarker({
  color,
  sizeClass = 'h-3 w-3',
  className = '',
}: Props): ReactElement {
  // Both variants use the foreground-contrast border so the shape reads on
  // any panel background. Fill: white piece -> foreground token (stays dark
  // on light mode / light on dark mode, matching chess's "light piece"); black
  // piece -> muted-foreground with lower contrast so the two sides are
  // immediately distinguishable without being overly emphatic.
  const fillClass = color === 'w' ? 'bg-card' : 'bg-foreground';
  const borderClass = 'border border-foreground';
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full ${sizeClass} ${fillClass} ${borderClass} ${className}`}
    />
  );
}
