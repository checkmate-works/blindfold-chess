import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { getMovingSide, parseFenMeta } from './fen-utils';

/**
 * Walk backwards through `moves` and find the last move made by the AI
 * (i.e. the side opposite to `playerSide`), then format just its move notation,
 * e.g. `"5... Nf6"` (Black) or `"1. e4"` (White).
 *
 * Returns only the notation — not the full "AI played …" sentence — so callers
 * can wrap it in localized, partially-bolded copy via `t.rich` (the move
 * notation is the bolded fragment, and its position within the sentence varies
 * by locale, so it must stay a separate value rather than be baked into a
 * pre-translated string).
 *
 * Returns `null` when there is no AI move to announce — either because the
 * move list is empty, or because none of the moves belong to the AI side.
 */
export function findLastAiMoveNotation(
  moves: readonly AlgebraicNotation[],
  playerSide: Side,
  startingFen: string | undefined
): string | null {
  if (moves.length === 0) {
    return null;
  }

  const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);

  for (let i = moves.length - 1; i >= 0; i--) {
    const isAiMove = getMovingSide(i, startingFen) !== playerSide;
    if (!isAiMove) continue;

    let moveNumber: number;
    let isWhiteMove: boolean;

    if (startsAsBlack) {
      moveNumber = startMoveNumber + Math.floor((i + 1) / 2);
      isWhiteMove = i % 2 === 1;
    } else {
      moveNumber = startMoveNumber + Math.floor(i / 2);
      isWhiteMove = i % 2 === 0;
    }

    return `${moveNumber}.${isWhiteMove ? '' : '..'} ${moves[i]}`;
  }

  return null;
}
