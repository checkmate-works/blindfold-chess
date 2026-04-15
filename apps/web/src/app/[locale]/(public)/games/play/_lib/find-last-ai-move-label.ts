import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { getMovingSide, parseFenMeta } from './fen-utils';

/**
 * Translation function shape accepted by {@link findLastAiMoveLabel}.
 *
 * Matches the shape of `useTranslations('play')` — it must understand the
 * `'aiPlayed'` key and interpolate a `{ move }` parameter into a string.
 */
export type AiMoveTranslator = (key: 'aiPlayed', values: { move: string }) => string;

/**
 * Walk backwards through `moves` and find the last move made by the AI
 * (i.e. the side opposite to `playerSide`), then format it as a localized
 * label such as `"AI played 5... Nf6"`.
 *
 * Returns `null` when there is no AI move to announce — either because the
 * move list is empty, or because none of the moves belong to the AI side.
 */
export function findLastAiMoveLabel(
  moves: readonly AlgebraicNotation[],
  playerSide: Side,
  startingFen: string | undefined,
  t: AiMoveTranslator
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

    const moveNotation = `${moveNumber}.${isWhiteMove ? '' : '..'} ${moves[i]}`;
    return t('aiPlayed', { move: moveNotation });
  }

  return null;
}
