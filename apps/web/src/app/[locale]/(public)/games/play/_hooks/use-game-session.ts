import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { GameOutcome, SkillLevel } from '@/lib/types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getMovingSide, parseFenMeta } from '../_lib/fen-utils';
import { useAiMoveOrchestration } from './use-ai-move-orchestration';
import { useAiVersus } from './use-ai-versus';
import { useAutoSave } from './use-auto-save';
import { parseUrlSearchParams, useGameInitialization } from './use-game-initialization';
import { useGamePersistence } from './use-game-persistence';
import { useGameState } from './use-game-state';
import { useMoveOperationTracker } from './use-move-operation-tracker';
import { useNotation } from './use-notation';
import { usePlayerMove } from './use-player-move';
import { useUrlSync } from './use-url-sync';

type UseGameSessionOptions = {
  locale: Locale;
  onAiMoveChange?: (move: string | null) => void;
};

export function useGameSession({ locale, onAiMoveChange }: UseGameSessionOptions) {
  const t = useTranslations('play');
  const searchParamsFromHook = useSearchParams();

  // Parse URL parameters
  const urlParams = parseUrlSearchParams(searchParamsFromHook);
  const {
    playerSide,
    initialSkillLevel,
    initialGameId,
    initialStartingFen,
    initialMovesFromUrl,
    initialGamePrefs,
    shouldRedirectToError,
    errorDetails,
  } = useGameInitialization(urlParams);

  // Skill level state (can be changed during game)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(initialSkillLevel);

  // Per-game preferences (from URL params for new games, loaded from saved game for resumed games)
  const [perGamePrefs, setPerGamePrefs] = useState<PerGamePreferences | undefined>(
    initialGamePrefs
  );

  // Track starting FEN - can be from URL or loaded from saved game
  const [startingFen, setStartingFen] = useState<string | undefined>(initialStartingFen);

  // Move input state (managed here to avoid circular deps between usePlayerMove and useAiMoveOrchestration)
  const [moveInput, setMoveInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Notation hook
  const {
    moves,
    pushMove,
    removeMoves,
    setMovesTo,
    fen: currentFen,
    formattedPgn,
  } = useNotation({
    initialMoves: initialMovesFromUrl,
    startingFen,
  });
  const { getAiMove } = useAiVersus(skillLevel);

  // Game persistence hook
  const { isLoadingFromStorage, savedGameStatus, loadedGameData, gameNotFound } =
    useGamePersistence({
      initialGameId,
      initialStartingFen,
    });

  // Game state hook
  const {
    gameStatus,
    setGameStatus,
    playerResult,
    setPlayerResult,
    isPlayerTurn,
    lastMove,
    setLastMove,
    shouldMakeAiMove,
    setShouldMakeAiMove,
  } = useGameState({
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
  });

  // Operation tracker hook
  const {
    logs: operationLogs,
    recordPeek,
    recordUndo,
    commitMove,
    handleUndoLog,
    truncateLogs,
  } = useMoveOperationTracker({
    initialLogs: loadedGameData?.operationLogs,
  });

  // Set per-game preferences from loaded game data (game resume)
  useEffect(() => {
    if (loadedGameData?.gamePreferences) {
      setPerGamePrefs(loadedGameData.gamePreferences);
    }
  }, [loadedGameData]);

  // Map board status to game outcome for repository
  const mapGameStatusToOutcome = useCallback(
    (bs: typeof gameStatus, pr: typeof playerResult): GameOutcome => {
      if (bs === 'in_progress') return 'in_progress';
      if (pr === 'win') return 'win';
      if (pr === 'loss') return 'loss';
      return 'draw';
    },
    []
  );

  // Auto-save hook
  const { markPlayerInteraction, updateSkillLevel, gameId } = useAutoSave({
    gameId: initialGameId,
    moves,
    playerColor: playerSide,
    skillLevel,
    status: mapGameStatusToOutcome(gameStatus, playerResult),
    startingFen,
    gamePreferences: perGamePrefs,
    operationLogs,
    enabled: !isLoadingFromStorage && !shouldRedirectToError && !gameNotFound,
    saveOnInit: !initialGameId && !shouldRedirectToError,
  });

  // URL sync hook
  const { searchParams, router } = useUrlSync({
    locale,
    gameId,
    initialGameId,
    playerSide,
    skillLevel,
    initialStartingFen,
    shouldRedirectToError,
    errorDetails,
  });

  // Keep moves in a ref for callbacks that don't need to re-create on every move change
  const movesRef = useRef(moves);
  movesRef.current = moves;

  // Internal helper to reduce duplicated state updates
  const recomputeGameState = useCallback(
    (newMoves: AlgebraicNotation[]) => {
      setLastMove(getLastMoveDetails(newMoves as string[], startingFen));
    },
    [startingFen, setLastMove]
  );

  // AI move orchestration
  const handleAiMoveSuccess = useCallback(
    (move: AlgebraicNotation) => {
      pushMove(move);
      const newMoves = [...movesRef.current, move];
      recomputeGameState(newMoves);
    },
    [pushMove, recomputeGameState]
  );

  const handleAiMoveError = useCallback(() => {
    setError('AI move failed');
    setShouldMakeAiMove(false);
  }, [setShouldMakeAiMove]);

  const { isLoading } = useAiMoveOrchestration({
    shouldMakeAiMove: shouldMakeAiMove && !gameNotFound,
    gameStatus,
    moves,
    playerSide,
    startingFen,
    getAiMove,
    onAiMoveSuccess: handleAiMoveSuccess,
    onAiMoveError: handleAiMoveError,
  });

  // Player move hook
  const { handleSubmitMove } = usePlayerMove({
    moves,
    startingFen,
    isLoading,
    isPlayerTurn,
    pushMove,
    markPlayerInteraction,
    setLastMove,
    setMoveInput,
    setError,
  });

  // Resign handler
  const handleResign = useCallback(() => {
    markPlayerInteraction();
    setGameStatus('checkmate');
    setPlayerResult('loss');
  }, [markPlayerInteraction, setGameStatus, setPlayerResult]);

  // Undo handler
  const handleUndo = useCallback(() => {
    markPlayerInteraction();
    removeMoves(2);
    setError(null);
    const newMoves = moves.slice(0, -2) as AlgebraicNotation[];
    recomputeGameState(newMoves);
    // handleUndoLog removes the last player's log entry and resets peek/undo counters.
    // Any peeks accumulated before this undo are intentionally discarded (the move "never happened").
    // recordUndo then tracks this undo event on the *next* move's log entry.
    handleUndoLog();
    recordUndo();
  }, [markPlayerInteraction, removeMoves, moves, recomputeGameState, handleUndoLog, recordUndo]);

  // Restart from position handler
  const handleRestartFromPosition = useCallback(
    (position: number) => {
      markPlayerInteraction();
      const movesToRemove = moves.length - position - 1;
      if (movesToRemove > 0) {
        removeMoves(movesToRemove);
      }
      const newMoves = moves.slice(0, position + 1) as AlgebraicNotation[];
      recomputeGameState(newMoves);

      // Truncate operation logs to match the number of player moves remaining.
      // Player moves are at even indices (white) or odd indices (black).
      const playerMoveCount =
        playerSide === 'white' ? Math.ceil((position + 1) / 2) : Math.floor((position + 1) / 2);
      truncateLogs(playerMoveCount);
    },
    [markPlayerInteraction, moves, removeMoves, recomputeGameState, playerSide, truncateLogs]
  );

  // Handle new game from position
  const handleNewGameFromPosition = useCallback(
    (position: number) => {
      const movesToKeep = moves.slice(0, position + 1);
      const params = new URLSearchParams();
      params.set('moves', JSON.stringify(movesToKeep));
      params.set('color', playerSide);
      params.set('skillLevel', skillLevel.toString());

      if (startingFen) {
        params.set('fen', startingFen);
      }

      router.push(`/${locale}/games/new/pgn?${params.toString()}`);
    },
    [moves, playerSide, skillLevel, locale, router, startingFen]
  );

  // Handle skill level change
  const handleSkillLevelChange = useCallback(
    async (newSkillLevel: SkillLevel) => {
      markPlayerInteraction();
      setSkillLevel(newSkillLevel);

      const params = new URLSearchParams(searchParams.toString());
      params.set('skillLevel', newSkillLevel.toString());
      router.replace(`?${params.toString()}`, { scroll: false });

      if (gameId) {
        await updateSkillLevel(newSkillLevel);
      }
    },
    [markPlayerInteraction, searchParams, router, gameId, updateSkillLevel]
  );

  // Current FEN and formatted PGN are memoized values from useNotation

  // Update parent component with AI's last move
  useEffect(() => {
    if (!onAiMoveChange) return;

    if (moves.length === 0) {
      onAiMoveChange(null);
      return;
    }

    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);

    const isAiMove = (index: number) => {
      return getMovingSide(index, startingFen) !== playerSide;
    };

    for (let i = moves.length - 1; i >= 0; i--) {
      if (isAiMove(i)) {
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
        const moveText = t('aiPlayed', { move: moveNotation });
        onAiMoveChange(moveText);
        return;
      }
    }

    onAiMoveChange(null);
  }, [moves, playerSide, startingFen, onAiMoveChange, t]);

  return {
    gameConfig: {
      playerSide,
      skillLevel,
      initialGameId,
      startingFen,
      locale,
      perGamePrefs,
      gameId,
    },
    gameState: {
      gameStatus,
      playerResult,
      isPlayerTurn,
      isLoading,
      lastMove,
      gameNotFound,
    },
    moveState: {
      moves,
      currentFen,
      formattedPgn,
    },
    moveInput: {
      value: moveInput,
      setValue: setMoveInput,
      error,
      setError,
    },
    actions: {
      handleSubmitMove,
      handleResign,
      handleUndo,
      handleRestartFromPosition,
      handleNewGameFromPosition,
      handleSkillLevelChange,
      commitMoveLog: commitMove,
      recordPeek,
    },
  };
}
