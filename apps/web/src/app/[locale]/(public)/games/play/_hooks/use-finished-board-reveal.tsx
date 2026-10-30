import { type ReactNode, useMemo, useState } from 'react';

import { foldBoardVisibility } from '@/lib/games/play-settings-log';
import { hidesAnyPiece, revealPieces } from '@/lib/games/reveal-preferences';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { BoardRevealToggle } from '../_components/BoardRevealToggle';

/**
 * Piece visibility for a finished board under review — the play result and
 * a completed recall share it.
 *
 * Revealed by default; the toggle is only offered when the game actually hid
 * something (`hidesAnyPiece` folds the board-visibility axis in, so a
 * peek/never game counts even though its per-side flags were both true).
 */
export function useFinishedBoardReveal(preferences: GamePreferences): {
  finishedPreferences: GamePreferences;
  finishedHiddenPieceStyle: 'absent' | 'ghost';
  revealToggle: ReactNode | undefined;
} {
  const [finishedRevealed, setFinishedRevealed] = useState(true);
  const canRevealFinished = hidesAnyPiece(preferences);
  const finishedPreferences = useMemo(
    () =>
      finishedRevealed
        ? revealPieces(preferences)
        : // As played: the same fold every other "as played" surface uses, so a
          // masked-board game reproduces as both sides hidden rather than as a
          // fully sighted position.
          { ...preferences, ...foldBoardVisibility(preferences) },
    [finishedRevealed, preferences]
  );

  return {
    finishedPreferences,
    // Nothing is hidden on a revealed board; in the as-played view the
    // pieces the player could not see are drawn as faint ghosts, which reads
    // as "you were blind to this" rather than as an empty square.
    finishedHiddenPieceStyle: finishedRevealed ? 'absent' : 'ghost',
    revealToggle: canRevealFinished ? (
      <BoardRevealToggle
        revealed={finishedRevealed}
        onToggle={() => setFinishedRevealed((prev) => !prev)}
      />
    ) : undefined,
  };
}
