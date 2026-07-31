import { useEffect, useRef, useState } from 'react';
import { useMemo } from 'react';

import { computeGameState } from '@blindfold-chess/features/ai-game';
import type { GameStatus } from '@blindfold-chess/features/ai-game';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { sumOperationLogs } from '@/lib/games/operation-totals';
import type {
  MoveOperationLog,
  OperationTotals,
  UndoneMoveLog,
} from '@/lib/games/saved-game-types';

type LoadedGameData = {
  startingFen?: string;
  setupPlies?: number;
  moves: AlgebraicNotation[];
  lastMove: { from: string; to: string } | null;
  gameStatus: GameStatus;
  playerResult: 'win' | 'loss' | 'draw' | null;
  operationLogs?: MoveOperationLog[];
  operationTotals?: OperationTotals;
  undoneLogs?: UndoneMoveLog[];
};

type UseGameStateOptions = {
  playerSide: Side;
  startingFen: string | undefined;
  moves: AlgebraicNotation[];
  initialMovesFromUrl: AlgebraicNotation[];
  initialGameId: string | undefined;
  isLoadingFromStorage: boolean;
  savedGameStatus: string | null;
  loadedGameData: LoadedGameData | null;
  setMovesTo: (moves: AlgebraicNotation[]) => void;
  setStartingFen: (fen: string | undefined) => void;
  setSetupPliesTo?: (setupPlies: number) => void;
  setOperationLogsTo?: (logs: MoveOperationLog[]) => void;
  /** Monotonic max-merge, not overwrite — see the tracker's `restoreTotals`. */
  restoreOperationTotals?: (totals: OperationTotals) => void;
  /** Longer-list merge, not overwrite — see the tracker's `restoreUndoneLogs`. */
  restoreUndoneLogs?: (undoneLogs: UndoneMoveLog[]) => void;
};

export function useGameState({
  playerSide,
  startingFen,
  moves,
  initialMovesFromUrl,
  initialGameId,
  isLoadingFromStorage,
  savedGameStatus,
  loadedGameData,
  setMovesTo,
  setStartingFen,
  setSetupPliesTo,
  setOperationLogsTo,
  restoreOperationTotals,
  restoreUndoneLogs,
}: UseGameStateOptions) {
  const [isPlayerTurn, setIsPlayerTurn] = useState(playerSide === 'white');
  const [gameStatus, setGameStatus] = useState<GameStatus>('in_progress');
  const [playerResult, setPlayerResult] = useState<'win' | 'loss' | 'draw' | null>(null);
  // Lazy-initialized from the URL-seeded moves: they are fixed for the life
  // of the mount, so this needs no effect (the old mount effect committed a
  // first frame with the highlight missing).
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(() =>
    initialMovesFromUrl.length > 0
      ? getLastMoveDetails(initialMovesFromUrl as string[], startingFen)
      : null
  );

  // `useGamePersistence` batches `loadedGameData` + `isLoadingFromStorage:
  // false` into one commit, but this hook applies `loadedGameData` in its
  // own effect below, which necessarily runs one render later. Without
  // tracking that gap, a caller gating on `isLoadingFromStorage` alone would
  // render one frame with the new "not loading" flag but the still-stale
  // `gameStatus`/`moves` defaults — e.g. a finished game briefly flashing as
  // an empty in-progress board. Comparing against the last-applied
  // `loadedGameData` reference (not a stateful flag, so it's accurate for
  // the very render where `loadedGameData` changes) lets callers fold this
  // into their own "still initializing" check — see `useGameSession`.
  const appliedLoadedGameDataRef = useRef<LoadedGameData | null>(null);
  const isApplyingLoadedGameData =
    loadedGameData !== null && appliedLoadedGameDataRef.current !== loadedGameData;

  const [shouldMakeAiMove, setShouldMakeAiMove] = useState(() => {
    if (initialGameId) {
      return false;
    }
    if (initialMovesFromUrl.length > 0) {
      const gameState = computeGameState(initialMovesFromUrl, playerSide, startingFen);
      return !gameState.isPlayerTurn && gameState.status === 'in_progress';
    }
    if (startingFen) {
      const fenParts = startingFen.split(' ');
      const turnFromFen = fenParts[1];
      const isWhiteToMove = turnFromFen === 'w';
      return (
        (playerSide === 'white' && !isWhiteToMove) || (playerSide === 'black' && isWhiteToMove)
      );
    }
    return playerSide === 'black';
  });

  // Apply loaded game data from persistence hook.
  // All state restoration (moves, logs, preferences) must happen in this single effect
  // to ensure React batches all state updates together, preventing auto-save from
  // triggering with partially-restored data (e.g., moves loaded but operationLogs still empty).
  useEffect(() => {
    if (loadedGameData) {
      if (loadedGameData.startingFen) {
        setStartingFen(loadedGameData.startingFen);
      }
      if (loadedGameData.setupPlies !== undefined && setSetupPliesTo) {
        setSetupPliesTo(loadedGameData.setupPlies);
      }
      if (loadedGameData.moves.length > 0) {
        setMovesTo(loadedGameData.moves);
        setLastMove(loadedGameData.lastMove);
      }
      if (loadedGameData.gameStatus !== 'in_progress') {
        setGameStatus(loadedGameData.gameStatus);
        setPlayerResult(loadedGameData.playerResult);
        setShouldMakeAiMove(false);
      }
      if (loadedGameData.operationLogs && setOperationLogsTo) {
        setOperationLogsTo(loadedGameData.operationLogs);
      }
      if (restoreOperationTotals) {
        // Records saved before operationTotals existed get a lossy baseline
        // (the sum of the surviving per-move counters) so the totals stay
        // monotonic from here on. Anything undo already erased is gone.
        // The restore is a max-merge, so when this effect fires mid-session
        // with a stale snapshot (new game → initial save → URL gains its
        // gameId), live counters recorded in the meantime are kept.
        restoreOperationTotals(
          loadedGameData.operationTotals ?? sumOperationLogs(loadedGameData.operationLogs ?? [])
        );
      }
      if (loadedGameData.undoneLogs && restoreUndoneLogs) {
        restoreUndoneLogs(loadedGameData.undoneLogs);
      }
      appliedLoadedGameDataRef.current = loadedGameData;
    }
  }, [
    loadedGameData,
    setMovesTo,
    setStartingFen,
    setSetupPliesTo,
    setOperationLogsTo,
    restoreOperationTotals,
    restoreUndoneLogs,
  ]);

  const derivedGameState = useMemo(
    () => computeGameState(moves, playerSide, startingFen),
    [moves, playerSide, startingFen]
  );

  // Update game state whenever moves change
  useEffect(() => {
    if (isLoadingFromStorage) {
      return;
    }

    if (savedGameStatus && savedGameStatus !== 'in_progress') {
      return;
    }

    const {
      isPlayerTurn: newIsPlayerTurn,
      status: newGameStatus,
      playerResult: newPlayerResult,
    } = derivedGameState;

    setIsPlayerTurn(newIsPlayerTurn);
    setGameStatus(newGameStatus);
    setPlayerResult(newPlayerResult);

    if (!newIsPlayerTurn && newGameStatus === 'in_progress') {
      setShouldMakeAiMove(true);
    } else {
      setShouldMakeAiMove(false);
    }
  }, [derivedGameState, savedGameStatus, isLoadingFromStorage]);

  return {
    gameStatus,
    setGameStatus,
    /**
     * The status the move list alone implies, before any player-driven
     * override is folded in. `gameStatus` can outrun it — resigning stamps
     * `'checkmate'` onto a position that is still playable — which is exactly
     * what makes a resignation identifiable downstream (`resolveTermination`).
     */
    derivedStatus: derivedGameState.status,
    playerResult,
    setPlayerResult,
    isPlayerTurn,
    lastMove,
    setLastMove,
    shouldMakeAiMove,
    setShouldMakeAiMove,
    isApplyingLoadedGameData,
  };
}
