'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { type GameResult, RESULT_LABEL_KEY, ResultIcon } from '../_lib/result-visuals';
import type { Termination } from '../_lib/termination';

type Props = {
  /** How the game ended — see `resolveTermination`. */
  termination: Termination;
  /** The player's own result, naming the outcome the termination produced. */
  result: GameResult;
};

/**
 * "Checkmate — you win" strip, attached to the bottom edge of a finished game's
 * board.
 *
 * It sits ON the board because that is where a player looks when the game ends:
 * the result was previously only stated in the overlay covering the move input
 * (below the board, off-screen on mobile) and in the auto-opening next-action
 * modal, so a dismissed modal left a board that looked mid-game. Naming the
 * *reason* is the other half — a resigned game and a mated game are the same
 * board otherwise, and the stored status cannot tell them apart on its own.
 *
 * A draw's reason and its outcome are the same word, so the result clause is
 * dropped there rather than rendering "Draw — draw".
 */
export function GameTerminationBanner({ termination, result }: Props) {
  const t = useTranslations('play');

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-t border-border bg-muted/40 px-4 py-2 text-sm font-medium text-foreground"
    >
      <ResultIcon result={result} className="h-4 w-4 shrink-0" />
      <span>{t(`finishedGame.termination.${termination}`)}</span>
      {termination !== 'draw' && (
        <>
          <span aria-hidden className="text-muted-foreground">
            —
          </span>
          <span>{t(RESULT_LABEL_KEY[result])}</span>
        </>
      )}
    </div>
  );
}
