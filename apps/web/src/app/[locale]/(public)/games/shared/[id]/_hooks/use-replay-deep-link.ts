'use client';

import { useEffect, useRef } from 'react';

import type { GameCommentItem } from '@/lib/db/game-comments';

/**
 * Parse the URL hash (`#14`) into a 0-based move index, or null when it is
 * absent / not a valid half-move number for this game.
 */
function parseHashPly(hash: string, moveCount: number): number | null {
  const raw = hash.replace(/^#/, '');
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (n < 1 || n > moveCount) return null;
  return n - 1;
}

type Params = {
  notationMovesLength: number;
  navigateToPosition: (position: number) => void;
  /** When set (from a like notification), open at this comment's move. */
  highlightCommentId: string | undefined;
  comments: GameCommentItem[];
  isInitialPosition: boolean;
  currentPosition: number;
  /**
   * Where to open when nothing deep-links (no comment, no hash). Defaults to
   * the overview board (-2); the result screen passes the game's setup
   * position instead, so a seeded game opens showing where play actually
   * started rather than the standard initial board.
   */
  fallbackPosition?: number;
};

/**
 * Open the replay at the right move and, for a deep-linked comment, scroll it
 * into view once its thread mounts.
 *
 * Priority for the initial position (runs once after moves load): a deep-linked
 * comment's move, then the `#<half-move>` URL hash (read client-side — the
 * fragment never reaches the server), then {@link Params.fallbackPosition}.
 */
export function useReplayDeepLink({
  notationMovesLength,
  navigateToPosition,
  highlightCommentId,
  comments,
  isInitialPosition,
  currentPosition,
  fallbackPosition = -2,
}: Params) {
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || notationMovesLength === 0) return;
    startedRef.current = true;
    const target = highlightCommentId
      ? comments.find((c) => c.id === highlightCommentId)
      : undefined;
    const commentPly =
      target && target.ply != null && target.ply < notationMovesLength ? target.ply : null;
    const hashPly = parseHashPly(window.location.hash, notationMovesLength);
    navigateToPosition(commentPly ?? hashPly ?? fallbackPosition);
    // startedRef makes re-runs no-ops, so the extra deps cannot re-trigger it.
  }, [notationMovesLength, navigateToPosition, highlightCommentId, comments, fallbackPosition]);

  // Once the deep-linked comment's move is on the board (its thread mounted),
  // scroll it into view. Runs once.
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (!highlightCommentId || scrolledRef.current || isInitialPosition) return;
    const el = document.getElementById(`game-comment-${highlightCommentId}`);
    if (!el) return;
    scrolledRef.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightCommentId, isInitialPosition, currentPosition]);
}
