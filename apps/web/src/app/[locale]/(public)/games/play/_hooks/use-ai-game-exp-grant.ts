'use client';

import { useEffect, useRef } from 'react';

import type { FinalGameOutcome } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';
import { computeGameStats } from '@/lib/games/compute-game-stats';
import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { saveGameResult } from '../result/_actions/save-game-result';

type Params = {
  /** Review mode (`?finished=1`): never grants — the game was played earlier. */
  isFinishedView: boolean;
  /** Whether the loaded game has reached a terminal result. */
  isFinished: boolean;
  gameId: string | undefined;
  /** Whether the viewer is signed in — guests trigger no grant. */
  isAuthenticated: boolean;
  playerResult: FinalGameOutcome | null;
  operationLogs: MoveOperationLog[] | null;
  engineConfig: EngineConfig;
};

/**
 * Grant AI-game Exp once when a game ends in live play, independent of
 * navigation. The game-finished modal makes visiting the result screen
 * optional, so the grant can no longer live only there (see the result
 * screen's {@link useGameExpGrant}). Fires at most once (`grantedRef`) and only
 * for a terminal result with at least one player move, by a signed-in player,
 * outside review mode. `saveGameResult` is idempotent on (source, gameId), so
 * the result screen's own grant stays safe. The returned Exp is intentionally
 * discarded here — the finished review shows the server-resolved value instead.
 * Best-effort: a failed grant never breaks the finished screen.
 */
export function useAiGameExpGrant({
  isFinishedView,
  isFinished,
  gameId,
  isAuthenticated,
  playerResult,
  operationLogs,
  engineConfig,
}: Params): void {
  const grantedRef = useRef(false);
  useEffect(() => {
    if (grantedRef.current) return;
    if (isFinishedView || !isFinished || !gameId || !isAuthenticated || !playerResult) return;
    const stats = computeGameStats(operationLogs ?? []);
    if (stats.totalMoves <= 0) return;
    grantedRef.current = true;
    saveGameResult({
      gameId,
      result: playerResult,
      engine: engineConfig,
      playerMoveCount: stats.totalMoves,
      aidedMoveCount: stats.aidedMoves,
    }).catch(() => {
      // Best-effort: a failed grant must never break the finished screen.
    });
  }, [
    isFinishedView,
    isFinished,
    gameId,
    isAuthenticated,
    playerResult,
    operationLogs,
    engineConfig,
  ]);
}
