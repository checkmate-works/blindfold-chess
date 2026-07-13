import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { mapGameStatusToOutcome } from '../_lib/map-game-status-to-outcome';
import { useAiMoveAnnouncer } from './use-ai-move-announcer';
import { useAiMoveOrchestration } from './use-ai-move-orchestration';
import { useAiMoveRetry } from './use-ai-move-retry';
import { useAiVersus } from './use-ai-versus';
import { useAutoSave } from './use-auto-save';
import { useGameActions } from './use-game-actions';
import { parseUrlSearchParams, useGameInitialization } from './use-game-initialization';
import { useGamePersistence } from './use-game-persistence';
import { useGameState } from './use-game-state';
import { useMoveOperationTracker } from './use-move-operation-tracker';
import { useNotation } from './use-notation';
import { usePlayerMove } from './use-player-move';
import { usePreferenceState } from './use-preference-state';
import { useUrlSync } from './use-url-sync';

type UseGameSessionOptions = {
  locale: Locale;
};

export function useGameSession({ locale }: UseGameSessionOptions) {
  const t = useTranslations('play');
  const searchParamsFromHook = useSearchParams();

  // Parse URL parameters
  const urlParams = parseUrlSearchParams(searchParamsFromHook);
  const {
    playerSide,
    initialEngineConfig,
    initialGameId,
    initialStartingFen,
    initialMovesFromUrl,
    initialGamePrefs,
    shouldRedirectToError,
    errorDetails,
  } = useGameInitialization(urlParams);

  // Engine + difficulty are immutable during gameplay — captured at game
  // start and never changed mid-game. The discriminated union encodes
  // both pieces together so we can't end up with a Maia engine paired
  // with a Stockfish skill level (or vice versa).
  const [engineConfig] = useState<EngineConfig>(initialEngineConfig);

  // Track starting FEN - can be from URL or loaded from saved game
  const [startingFen, setStartingFen] = useState<string | undefined>(initialStartingFen);

  // How many leading half-moves were pre-played at setup (opening line /
  // pasted PGN) — see {@link Game.setupPlies}. For a new game the URL's seeded
  // moves ARE the prefix; a resumed game restores it from the saved record
  // (via useGameState, alongside the moves). Undefined = no seeded prefix.
  const [setupPlies, setSetupPlies] = useState<number | undefined>(
    initialGameId ? undefined : initialMovesFromUrl.length || undefined
  );

  // Move input state (managed here to avoid circular deps between usePlayerMove and useAiMoveOrchestration)
  const [moveInput, setMoveInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Preserved copy of the exact string the user last tried to submit.
  // Populated on invalid-move failure so the status slot can show
  // "⚠ Invalid move: {lastAttemptedInput}". Cleared alongside error.
  const [lastAttemptedInput, setLastAttemptedInput] = useState('');

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
  const { getAiMove, reset: resetAiOpponent } = useAiVersus(engineConfig);

  // Game persistence hook
  const { isLoadingFromStorage, savedGameStatus, loadedGameData, gameNotFound } =
    useGamePersistence({
      initialGameId,
      initialStartingFen,
    });

  // Per-game preference state — initial snapshot, append-only change log,
  // and the derived "effective right now" view, plus the restoration
  // effect that seeds them from a resumed game. See the hook's TSDoc for
  // why these three move together.
  const { initialPerGamePrefs, preferenceChangeLog, currentPerGamePrefs, appendPreferenceChange } =
    usePreferenceState({ initialGamePrefs, loadedGameData });

  // Operation tracker hook — declared before useGameState so setLogsTo can be
  // passed to useGameState for synchronized restoration alongside moves.
  const {
    logs: operationLogs,
    recordPeek,
    recordUndo,
    recordMovePeek,
    recordInvalid,
    commitMove,
    handleUndoLog,
    truncateLogs,
    setLogsTo,
  } = useMoveOperationTracker();

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
    isApplyingLoadedGameData,
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
    setSetupPliesTo: setSetupPlies,
    setOperationLogsTo: setLogsTo,
  });

  // Undo / restart-from-position can strip seeded setup moves. Once the move
  // list drops below the prefix the player has taken over from that earlier
  // point, so the prefix has genuinely shrunk — ratchet it down permanently
  // (it never grows back, even if play advances past the old length again).
  useEffect(() => {
    setSetupPlies((prev) => (prev !== undefined && moves.length < prev ? moves.length : prev));
  }, [moves.length]);

  // `isLoadingFromStorage` flips to `false` the instant `useGamePersistence`
  // resolves, but `useGameState` applies the loaded moves/status/result one
  // render later (its own effect, keyed on the new `loadedGameData`
  // reference). Folding `isApplyingLoadedGameData` in here means every
  // consumer of `gameState.isLoadingFromStorage` (the page-level
  // `isInitializing`, `useAutoSave`'s `enabled` below, ...) keeps treating
  // the session as "still loading" for that one extra render, instead of
  // momentarily rendering/saving a finished game as an empty in-progress one.
  const isRestoringGameData = isLoadingFromStorage || isApplyingLoadedGameData;

  // Map board status to game outcome for repository

  // Auto-save hook. `gamePreferences` carries the INITIAL snapshot (immutable
  // for the life of the game); `preferenceChangeLog` carries the timeline of
  // mid-game edits. Together they reconstruct the current effective values
  // on the next load via `foldPreferences`.
  const { markPlayerInteraction, markPendingChange, gameId } = useAutoSave({
    gameId: initialGameId,
    moves,
    playerColor: playerSide,
    engineConfig,
    status: mapGameStatusToOutcome(gameStatus, playerResult),
    startingFen,
    setupPlies,
    gamePreferences: initialPerGamePrefs,
    preferenceChangeLog,
    operationLogs,
    enabled: !isRestoringGameData && !shouldRedirectToError && !gameNotFound,
    saveOnInit: !initialGameId && !shouldRedirectToError,
  });

  // URL sync hook
  const { router } = useUrlSync({
    locale,
    gameId,
    initialGameId,
    playerSide,
    engineConfig,
    initialStartingFen,
    shouldRedirectToError,
    errorDetails,
  });

  // Keep moves in a ref for callbacks that don't need to re-create on every move change
  const movesRef = useRef(moves);
  movesRef.current = moves;

  // Internal helper to reduce duplicated state updates
  const updateLastMove = useCallback(
    (newMoves: AlgebraicNotation[]) => {
      setLastMove(getLastMoveDetails(newMoves as string[], startingFen));
    },
    [startingFen, setLastMove]
  );

  // Move-landed signal — bumped once per completed AI move. Drives the on-board
  // `AiReplyChip` (re-triggers its visibility window). A counter (not a boolean)
  // so each move is a distinct change even when two land back-to-back.
  const [aiMoveSignal, setAiMoveSignal] = useState(0);

  // AI move orchestration
  const handleAiMoveSuccess = useCallback(
    (move: AlgebraicNotation) => {
      pushMove(move);
      const newMoves = [...movesRef.current, move];
      updateLastMove(newMoves);
      // Bump here — not in an effect on `moves` — so the chip refreshes only
      // for AI moves, never for player moves, undo, or game restore.
      setAiMoveSignal((n) => n + 1);
    },
    [pushMove, updateLastMove]
  );

  // AI-move failure + retry state machine, kept separate from the generic
  // `error` slot so the UI can distinguish "AI move failed" (surface a Retry
  // button) from the regular "invalid move" path (no Retry — the user just
  // edits their input). `clearMoveError` clears both in lockstep because any
  // input edit is treated as the user moving on from either error.
  const { aiMoveError, handleAiMoveError, retryAiMove, clearAiMoveError } = useAiMoveRetry({
    t,
    setError,
    setLastAttemptedInput,
    setShouldMakeAiMove,
    resetAiOpponent,
  });

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
    setLastAttemptedInput,
  });

  // Reset the invalid-move display in one call (used by the game actions
  // below; the user-facing clearMoveError additionally clears AI errors).
  const clearInputError = useCallback(() => {
    setError(null);
    setLastAttemptedInput('');
  }, []);

  // Game-level actions (resign / undo / restart / new-game-from-position) —
  // the move-array + operation-log coordination lives in useGameActions.
  const { handleResign, handleUndo, handleRestartFromPosition, handleNewGameFromPosition } =
    useGameActions({
      locale,
      moves,
      playerSide,
      startingFen,
      engineConfig,
      markPlayerInteraction,
      setGameStatus,
      setPlayerResult,
      removeMoves,
      updateLastMove,
      clearInputError,
      handleUndoLog,
      recordUndo,
      truncateLogs,
      navigate: (url) => router.push(url),
    });

  // Current FEN and formatted PGN are memoized values from useNotation

  // Notation of the AI's last move (e.g. "1... e5"), or null when there is
  // nothing to announce. The on-board chip wraps it in localized copy and
  // bolds the notation; keeping it unwrapped lets that bolding stay locale-safe.
  const aiMoveNotation = useAiMoveAnnouncer({
    moves,
    playerSide,
    startingFen,
  });

  // Surface the "AI is computing" state so the page-level status slot can show
  // it in place of rendering an inline "AI is thinking…" line, avoiding
  // vertical layout shift on every AI turn.
  const isAiThinking = !isPlayerTurn && isLoading;

  // Mid-game per-game-preference edit. Delegates the append-or-noop
  // decision to `usePreferenceState`; only when an entry was actually
  // appended do we mark a pending change for auto-save. Settings-only
  // edits (no move made) need this hook boundary because
  // `useSaveTrigger` only watches moves/status — without it the change
  // would be lost on Save&Exit / navigation / page hide.
  // See SPEC1 blocker 2.
  const setPerGamePref = useCallback(
    <K extends keyof PerGamePreferences>(key: K, value: PerGamePreferences[K]) => {
      const appended = appendPreferenceChange(key, value, moves.length);
      if (appended) markPendingChange();
    },
    [appendPreferenceChange, moves.length, markPendingChange]
  );

  // Clear both the error and the preserved attempted-input in one call.
  // Wired to every child input component's `onErrorClear` so that any user
  // edit reverts the status slot back to "AI played …" / "Play Chess".
  // Also clears any AI-move error so the Retry affordance disappears in
  // lockstep — otherwise an invalid-move edit would leave the Retry button
  // hanging around after the user had moved on.
  const clearMoveError = useCallback(() => {
    setError(null);
    clearAiMoveError();
    setLastAttemptedInput('');
  }, [setError, clearAiMoveError, setLastAttemptedInput]);

  return {
    gameConfig: {
      playerSide,
      engineConfig,
      initialGameId,
      startingFen,
      // Seeded-prefix length — aligns the ops icons / By Move strip with the
      // operation logs (one entry per in-session player move).
      setupPlies,
      locale,
      // `perGamePrefs` is the LIVE effective value (initial folded with the
      // change log). PlayClient merges this into its rendering preferences
      // so mid-game edits take effect immediately on the board.
      perGamePrefs: currentPerGamePrefs,
      // The immutable snapshot taken at game start. Exposed so consumers
      // (e.g. OperationLogModal's "Initial Settings" section) can show what
      // the player started with, distinct from where they are now.
      initialPerGamePrefs,
      // Append-only timeline of edits. Empty for games that were never
      // edited mid-game (the overwhelmingly common case).
      preferenceChangeLog,
      gameId,
    },
    gameState: {
      gameStatus,
      playerResult,
      isPlayerTurn,
      isLoading,
      isLoadingFromStorage: isRestoringGameData,
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
      lastAttemptedInput,
      clearMoveError,
    },
    aiMoveError: {
      message: aiMoveError,
      retry: retryAiMove,
    },
    aiMoveNotation,
    isAiThinking,
    aiMoveSignal,
    actions: {
      handleSubmitMove,
      handleResign,
      handleUndo,
      handleRestartFromPosition,
      handleNewGameFromPosition,
      commitMoveLog: commitMove,
      recordPeek,
      recordMovePeek,
      recordInvalid,
      setPerGamePref,
    },
    operationLogs,
  };
}

export type GameSession = ReturnType<typeof useGameSession>;
