'use client';

import { useEffect, useRef, useState } from 'react';

import type { ExpInfo } from '@blindfold-chess/features/exp';

import type { Game } from '@/lib/games/saved-game-types';

import { saveGameResult } from '../_actions/save-game-result';
import type { GameStats } from '../_lib/compute-game-stats';

type Options = {
  gameId: string;
  game: Game;
  stats: GameStats;
  /** Whether the viewer is signed in. Guests never trigger a grant. */
  isAuthenticated: boolean;
  /**
   * Exp already resolved server-side from the game id (a revisit / reload).
   * When present, the grant has already happened and no action call is made —
   * the value is shown as-is.
   */
  initialExp: ExpInfo | null;
};

/**
 * Triggers the one-time AI-game Exp grant from the result screen and returns
 * the Exp to display.
 *
 * AI games live only in localStorage, so the grant must originate client-side
 * once the finished game is loaded. The `savedRef` guard plus the server-side
 * idempotency on (source, gameId) keep this to exactly one effective grant per
 * game, even across the effect re-running or the screen being revisited.
 *
 * No grant is attempted for guests, for games with no player moves, or when
 * `initialExp` was already resolved server-side (a reload of a granted game).
 */
export function useGameExpGrant({
  gameId,
  game,
  stats,
  isAuthenticated,
  initialExp,
}: Options): ExpInfo | null {
  const [exp, setExp] = useState<ExpInfo | null>(initialExp);
  const savedRef = useRef(false);

  useEffect(() => {
    if (savedRef.current) return;
    if (!isAuthenticated || initialExp || stats.totalMoves <= 0) return;
    savedRef.current = true;

    const result = game.status === 'win' ? 'win' : game.status === 'loss' ? 'loss' : 'draw';

    saveGameResult({
      gameId,
      result,
      // EngineConfig is structurally identical to GameExpEngine.
      engine: game.engineConfig,
      playerMoveCount: stats.totalMoves,
      aidedMoveCount: stats.aidedMoves,
    })
      .then((res) => {
        if (res.success && res.exp) setExp(res.exp);
      })
      .catch(() => {
        // Best-effort: a failed grant must never break the result screen.
      });
  }, [gameId, game, stats, isAuthenticated, initialExp]);

  return exp;
}
