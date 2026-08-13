import type { Side } from '@blindfold-chess/types';
import { FaChessKing } from 'react-icons/fa';

import type { DetectedOpening } from '@/lib/openings/detect-game-opening';

import type { Locale } from '@/app/[locale]/_lib/types';

import { OpeningTag } from './OpeningTag';

type Props = {
  /** Side the player had. */
  playerColor: Side;
  /** Localized "White" / "Black" (resolved by the caller — server or client). */
  colorLabel: string;
  /** The opening reached, or null when none was detected. */
  opening: DetectedOpening | null;
  /** Localized opening name (resolved by the caller); required when `opening` is set. */
  openingDisplayName?: string;
  locale: Locale;
};

/**
 * One row pairing the player's colour (a white/black king chip + label) with the
 * opening they reached (linked to its topic page). Shared so the play-result
 * screen and the shared-games gallery render it identically. Presentational:
 * the caller resolves the localized colour + opening names and passes them in.
 */
export function GameColorOpeningRow({
  playerColor,
  colorLabel,
  opening,
  openingDisplayName,
  locale,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5" title={colorLabel}>
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
            playerColor === 'white'
              ? 'border-border bg-white text-neutral-900'
              : 'border-neutral-700 bg-neutral-900 text-white'
          }`}
        >
          <FaChessKing className="h-3 w-3" aria-hidden />
        </span>
        <span className="text-muted-foreground">{colorLabel}</span>
      </span>
      {opening && openingDisplayName && (
        <OpeningTag
          compact
          slug={opening.slug}
          displayName={openingDisplayName}
          ecoCode={opening.ecoCode}
          locale={locale}
        />
      )}
    </div>
  );
}
