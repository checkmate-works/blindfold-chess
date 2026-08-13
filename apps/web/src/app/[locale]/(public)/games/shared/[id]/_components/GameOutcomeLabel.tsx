'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';
import { FaMinus, FaTrophy } from 'react-icons/fa';

type Props = {
  /** Result from the author's (player's) perspective. */
  result: 'win' | 'loss' | 'draw';
  /** Side the author played, used to name the winner neutrally. */
  playerColor: Side;
};

/**
 * Neutral win/loss/draw label for the shared game review, shown at the top of
 * the Game Stats block (the `statsHeader` slot of {@link GameReview}). Mirrors
 * the result screen's {@link CompactResultHeader} visually, but a shared game is
 * viewed by third parties, so it names the winning side ("White won" / "Black
 * won" / "Draw") rather than using the player's first-person "You Win!".
 */
export function GameOutcomeLabel({ result, playerColor }: Props) {
  const t = useTranslations('sharedGames');

  // The winning side from the author-perspective result.
  const winner =
    result === 'draw'
      ? null
      : result === 'win'
        ? playerColor
        : playerColor === 'white'
          ? 'black'
          : 'white';

  return (
    <div className="flex items-center gap-2">
      {winner ? (
        <FaTrophy className="h-5 w-5 text-primary" />
      ) : (
        <FaMinus className="h-5 w-5 text-warning" />
      )}
      <span className="text-lg font-bold">
        {winner === 'white'
          ? t('result.whiteWon')
          : winner === 'black'
            ? t('result.blackWon')
            : t('result.draw')}
      </span>
    </div>
  );
}
