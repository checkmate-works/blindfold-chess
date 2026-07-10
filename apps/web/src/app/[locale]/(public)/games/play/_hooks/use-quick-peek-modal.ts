'use client';

import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import type { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { useMoveNavigation } from './use-move-navigation';

type LastMove = ReturnType<typeof getLastMoveDetails> | null;

type Params = {
  notationMoves: AlgebraicNotation[];
  startingFen: string | undefined;
  /** Highlighted move for a navigation position — shared with the live board. */
  lastMoveAt: (position: number) => LastMove;
  /** Adopt a previewed position onto the live replay board. */
  navigateToPosition: (position: number) => void;
};

type QuickPeekModal = {
  /** The modal's own navigation state, independent of the live replay. */
  nav: ReturnType<typeof useMoveNavigation>;
  isOpen: boolean;
  /** Ref for the live board column — the commit action scrolls it into view. */
  boardColumnRef: RefObject<HTMLDivElement | null>;
  /** Highlighted move for the previewed position. */
  lastMove: LastMove;
  /** Open the modal previewing a move (moves[] index). */
  openAtMove: (movesIndex: number) => void;
  /** Close without committing. */
  close: () => void;
  /** Commit the previewed position to the live replay, close, and scroll to it. */
  commit: () => void;
};

/**
 * A position quick-peek modal over a live board: an independent
 * `useMoveNavigation` so previewing a position never disturbs the live board
 * (replay state, comment thread, URL), plus open/close state and a "commit to
 * live" action that adopts the previewed position and scrolls the board into
 * view. The rAF defers the scroll until the modal's scroll-lock has been
 * released on that render. Used by the shared-game review's "By Move" strip
 * and recall's completion-summary per-move strip.
 */
export function useQuickPeekModal({
  notationMoves,
  startingFen,
  lastMoveAt,
  navigateToPosition,
}: Params): QuickPeekModal {
  const nav = useMoveNavigation({ moves: notationMoves, startingFen });
  const [isOpen, setIsOpen] = useState(false);
  const boardColumnRef = useRef<HTMLDivElement>(null);

  const lastMove = useMemo(
    () => lastMoveAt(nav.currentPosition),
    [lastMoveAt, nav.currentPosition]
  );

  const openAtMove = useCallback(
    (movesIndex: number) => {
      nav.navigateToPosition(movesIndex);
      setIsOpen(true);
    },
    [nav]
  );

  const close = useCallback(() => setIsOpen(false), []);

  const commit = useCallback(() => {
    navigateToPosition(nav.currentPosition);
    setIsOpen(false);
    requestAnimationFrame(() => {
      boardColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [navigateToPosition, nav]);

  return { nav, isOpen, boardColumnRef, lastMove, openAtMove, close, commit };
}
