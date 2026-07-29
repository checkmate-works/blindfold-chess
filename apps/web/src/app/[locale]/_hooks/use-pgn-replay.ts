'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  formatMovesToPgn,
  getFenAfterMoves,
  getLastMoveDetails,
  getStartingFen,
} from '@blindfold-chess/features/chess-core';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';

type Options = {
  /** SAN moves of the line, in order. */
  moves: readonly string[];
  /** Position the moves start from; defaults to the standard start. */
  startingFen?: string;
  /**
   * Pre-computed FEN of the final position, when the caller already has it
   * (a server-supplied `opening.fen`, an attachment's stored end position).
   * Used verbatim at the last index so opening a replay at the end — which
   * is where every caller starts — costs no replay at all.
   */
  finalFen?: string;
  /**
   * Where the cursor starts. Defaults to the final position. A number is a
   * concrete cursor value in the same space as {@link PgnReplay.index} (-1 =
   * before any move), clamped like every other cursor write — the embed
   * surface takes one from the URL, where any integer is expressible.
   */
  initialIndex?: 'start' | 'end' | number;
};

export type PgnReplay = {
  /** -1 = before any move; 0..total-1 = the position after that move. */
  index: number;
  total: number;
  /** Board position at `index`. */
  fen: string;
  /** Squares of the move that produced `fen`; null at the start position. */
  lastMove: { from: string; to: string } | null;
  /** Numbered move pairs for `HorizontalMoveList`. */
  formattedPgn: FormattedPgnMove[];
  isAtStart: boolean;
  isAtEnd: boolean;
  toStart: () => void;
  previous: () => void;
  next: () => void;
  toEnd: () => void;
  toIndex: (index: number) => void;
};

/**
 * Cursor + derived board state for stepping through a finished line of moves.
 *
 * @design Why not `useMoveNavigation`
 *
 * games/play's `useMoveNavigation` is built for a board that is still being
 * played on: its cursor carries a distinct "latest" value (-1) that is not the
 * same as the last move's index, because only that value may accept a new
 * move, and it deliberately collapses the two so a board can never end up
 * visually current but permanently non-interactive. A replay of someone
 * else's finished game has no such state — the final position is just the last
 * index — so surfaces that only look (an opening's line, an attached game)
 * used the plain [-1 .. total-1] cursor instead and each derived the FEN, the
 * last-move squares, the formatted move pairs and the four handlers again.
 * This owns that derivation; the play-time hook keeps its own cursor space.
 */
export function usePgnReplay({
  moves,
  startingFen,
  finalFen,
  initialIndex = 'end',
}: Options): PgnReplay {
  const total = moves.length;
  const baseFen = startingFen ?? getStartingFen();
  const lastIndex = total - 1;

  const [index, setIndex] = useState(() => {
    if (typeof initialIndex === 'number') return initialIndex;
    return initialIndex === 'start' ? -1 : lastIndex;
  });

  // Clamped rather than trusted: `moves` can shrink under a live cursor (the
  // repertoire viewer switches lines), and a stale index would replay moves
  // that no longer exist.
  const current = Math.min(Math.max(index, -1), lastIndex);

  const fen = useMemo(() => {
    if (current === -1) return baseFen;
    if (current === lastIndex && finalFen) return finalFen;
    return getFenAfterMoves(baseFen, moves.slice(0, current + 1) as string[]);
  }, [current, lastIndex, baseFen, finalFen, moves]);

  const lastMove = useMemo(
    () =>
      current === -1 ? null : getLastMoveDetails(moves.slice(0, current + 1) as string[], baseFen),
    [current, moves, baseFen]
  );

  // Numbering follows the starting position: a line set up from a FEN where
  // Black is to move opens at "12...Kh8", not "1. Kh8".
  const formattedPgn = useMemo(() => {
    const { startsAsBlack, startMoveNumber } = parseFenMeta(baseFen);
    return formatMovesToPgn(moves, startsAsBlack, startMoveNumber);
  }, [moves, baseFen]);

  const toStart = useCallback(() => setIndex(-1), []);
  const previous = useCallback(() => setIndex((i) => Math.max(-1, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(lastIndex, i + 1)), [lastIndex]);
  const toEnd = useCallback(() => setIndex(lastIndex), [lastIndex]);
  const toIndex = useCallback(
    (target: number) => setIndex(Math.min(Math.max(target, -1), lastIndex)),
    [lastIndex]
  );

  return {
    index: current,
    total,
    fen,
    lastMove,
    formattedPgn,
    isAtStart: current === -1,
    isAtEnd: current === lastIndex,
    toStart,
    previous,
    next,
    toEnd,
    toIndex,
  };
}
