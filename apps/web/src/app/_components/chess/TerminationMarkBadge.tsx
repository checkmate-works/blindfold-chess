import { flagData } from '@blindfold-chess/icons/data';

import type { TerminationMarkKind } from '@/lib/games/termination-mark';
import { HASH_GLYPH_PATHS, TERMINATION_MARK_STYLE } from '@/lib/games/termination-mark';

type Props = {
  kind: TerminationMarkKind;
  /** Accessible name — the caller owns the wording (and its locale). */
  label: string;
};

/**
 * The badge riding on the toppled king's square: `#` for a checkmate, a flag
 * for a resignation.
 *
 * Both glyphs are stroke paths rather than characters, and both come from data
 * the SVG/GIF renderer can read too (`HASH_GLYPH_PATHS`, `flagData`) — that
 * renderer has no fonts available, so a `#` typed as text would rasterize to
 * tofu. Keeping the DOM board on the same paths means the mark cannot drift
 * between the board and its exported replay.
 */
export function TerminationMarkBadge({ kind, label }: Props) {
  const { fill, glyph } = TERMINATION_MARK_STYLE[kind];
  const paths = glyph === 'hash' ? HASH_GLYPH_PATHS : flagData.paths;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="flex h-5 w-5 items-center justify-center rounded-full shadow-sm ring-1 ring-white/70 sm:h-6 sm:w-6"
      style={{ backgroundColor: fill }}
    >
      {/* The flag is a thinner drawing than the hash (a pole plus two waves), so
          it carries a heavier stroke to stay legible at badge size. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-[72%] w-[72%]"
        fill="none"
        stroke="#ffffff"
        strokeWidth={glyph === 'hash' ? 2.6 : 2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}
