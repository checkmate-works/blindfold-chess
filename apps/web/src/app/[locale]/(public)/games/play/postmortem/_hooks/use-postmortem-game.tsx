import { useCallback, useEffect, useMemo, useState } from 'react';

import { replayMoves } from '@blindfold-chess/features/chess-core';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { EvaluationMark } from '@/lib/evaluation';

import { getMovingSide } from '../../_lib/fen-utils';
import type { EvaluationFilters, MoveLogEntry } from '../_lib';
import {
  isPlayerTurn as computeIsPlayerTurn,
  formatMoveNotation,
  formatMovesToPgn,
  getCurrentEvaluationMark,
} from '../_lib';
import { usePostmortemActions } from './use-postmortem-actions';
import { usePostmortemFilters } from './use-postmortem-filters';
import { usePostmortemInit } from './use-postmortem-init';
import { usePostmortemNavigation } from './use-postmortem-navigation';

/**
 * Data describing the selected move for display.
 * The consuming component is responsible for rendering this into JSX.
 */
export type SelectedMoveDisplay =
  | { type: 'correct'; moveNotation: string }
  | { type: 'incorrect'; moveNotation: string }
  | { type: 'auto'; moveNotation: string }
  | {
      type: 'navigated';
      moveNotation: string;
      evaluation?: { loss: number; isMate: boolean };
    };

type Props = {
  pgn: string;
  playerColor: 'white' | 'black';
  autoOpponent: boolean;
  initialOffset?: number;
  startingFen?: string;
  onSelectedMoveChange?: (moveDisplay: SelectedMoveDisplay | null) => void;
};

type PostmortemGameReturn = {
  gameProgress: {
    originalMoves: AlgebraicNotation[];
    currentMoveIndex: number;
    userMoves: AlgebraicNotation[];
    isCompleted: boolean;
    totalMoves: number;
    progress: number;
  };
  boardState: {
    currentFen: string;
    displayFen: string | null;
    currentLastMove: { from: string; to: string } | null;
    currentEvaluationMark: EvaluationMark | null;
    gamePositions: ReturnType<typeof replayMoves>;
  };
  moveInput: {
    value: string;
    setValue: (v: string) => void;
    isEvaluating: boolean;
    isAnalyzingAll: boolean;
  };
  moveLog: {
    entries: MoveLogEntry[];
    filteredEntries: MoveLogEntry[];
    hasAnyEvaluation: boolean;
  };
  settings: {
    autoOpponent: boolean;
    setAutoOpponent: (v: boolean) => void;
    showEvaluation: boolean;
    setShowEvaluation: (v: boolean) => void;
    dontKnowCount: number;
    isPlayerTurn: boolean;
  };
  navigation: {
    currentPosition: number;
    selectedMoveIndex: number | null;
    setSelectedMoveIndex: (i: number | null) => void;
    navigateToPosition: (pos: number) => void;
    navigateToStart: () => void;
    navigateToEnd: () => void;
    navigatePrevious: () => void;
    navigateNext: () => void;
  };
  filters: {
    value: EvaluationFilters;
    setValue: React.Dispatch<React.SetStateAction<EvaluationFilters>>;
    reset: () => void;
  };
  actions: {
    handleSubmitMove: (move: AlgebraicNotation) => Promise<void>;
    handleDontKnow: () => Promise<void>;
    handleAnalyzeAll: () => Promise<void>;
    handleMoveClick: (entry: MoveLogEntry) => void;
  };
  formattedPgn: FormattedPgnMove[];
};

export function usePostmortemGame({
  pgn,
  playerColor,
  autoOpponent: initialAutoOpponent,
  initialOffset = 0,
  startingFen,
  onSelectedMoveChange,
}: Props): PostmortemGameReturn {
  // Initialization: PGN parsing, move validation, game positions
  const {
    originalMoves,
    currentMoveIndex,
    setCurrentMoveIndex,
    userMoves,
    setUserMoves,
    isCompleted,
    setIsCompleted,
    startsAsBlack,
    startMoveNumber,
    gamePositions,
  } = usePostmortemInit({ pgn, initialOffset, startingFen });

  // Local state
  const [moveInputValue, setMoveInputValue] = useState('');
  const [autoOpponent, setAutoOpponent] = useState(initialAutoOpponent);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [showEvaluation, setShowEvaluation] = useState(false);

  // Hooks: Navigation
  const navigation = usePostmortemNavigation({
    originalMovesLength: originalMoves.length,
    gamePositions,
  });
  const { currentPosition, selectedMoveIndex, displayFen, navigateToPosition, navigateToStart } =
    navigation;

  // Get current FEN for board display
  const getCurrentFen = useCallback(() => {
    if (selectedMoveIndex !== null) {
      return gamePositions[selectedMoveIndex + 1]?.fen ?? gamePositions[0]?.fen;
    }
    return gamePositions[userMoves.length]?.fen ?? gamePositions[0]?.fen;
  }, [userMoves.length, gamePositions, selectedMoveIndex]);

  // Check if current move is player's turn
  const playerTurn = useMemo(
    () =>
      computeIsPlayerTurn(currentMoveIndex, playerColor, autoOpponent, startingFen, getMovingSide),
    [currentMoveIndex, playerColor, autoOpponent, startingFen]
  );

  // Hooks: Actions
  const {
    isEvaluating,
    isAnalyzingAll,
    dontKnowCount,
    handleSubmitMove: rawHandleSubmit,
    handleDontKnow: rawHandleDontKnow,
    handleAnalyzeAll,
  } = usePostmortemActions({
    originalMoves,
    userMoves,
    currentMoveIndex,
    moveLog,
    gamePositions,
    startsAsBlack,
    startMoveNumber,
    showEvaluation,
    isPlayerTurn: playerTurn,
    autoOpponent,
    isCompleted,
    setUserMoves,
    setCurrentMoveIndex,
    setMoveLog,
    setIsCompleted,
  });

  const handleSubmitMove = useCallback(
    async (move: AlgebraicNotation) => rawHandleSubmit(move, setMoveInputValue),
    [rawHandleSubmit]
  );

  const handleDontKnow = useCallback(
    async () => rawHandleDontKnow(setMoveInputValue),
    [rawHandleDontKnow]
  );

  // Hooks: Filters
  const {
    filters: filterValue,
    setFilters,
    filteredEntries,
    handleResetFilters,
  } = usePostmortemFilters({
    moveLog,
    playerColor,
  });

  // Check if any move has evaluation
  const hasAnyEvaluation = useMemo(() => {
    return moveLog.some((entry) => entry.evaluation !== undefined);
  }, [moveLog]);

  // Handle move log click
  const handleMoveClick = useCallback(
    (entry: MoveLogEntry) => {
      let originalMoveIndex = 0;
      for (const logEntry of moveLog) {
        if (logEntry === entry) {
          if (entry.status === 'incorrect') {
            if (originalMoveIndex > 0) {
              navigateToPosition(originalMoveIndex - 1);
            } else {
              navigateToStart();
            }
            return;
          }
          navigateToPosition(originalMoveIndex);
          return;
        }
        if (logEntry.status !== 'incorrect') {
          originalMoveIndex++;
        }
      }
    },
    [moveLog, navigateToPosition, navigateToStart]
  );

  // Update parent with latest move result during play
  useEffect(() => {
    if (!onSelectedMoveChange) return;
    if (isCompleted) return;
    if (moveLog.length === 0) {
      onSelectedMoveChange(null);
      return;
    }

    const latestEntry = moveLog[moveLog.length - 1];

    if (latestEntry.status === 'correct') {
      onSelectedMoveChange({
        type: 'correct',
        moveNotation: formatMoveNotation(latestEntry),
      });
    } else if (latestEntry.status === 'incorrect') {
      const incorrectNotation = latestEntry.isWhiteMove
        ? `${latestEntry.moveNumber}. ${latestEntry.incorrectMove}`
        : `${latestEntry.moveNumber}... ${latestEntry.incorrectMove}`;
      onSelectedMoveChange({
        type: 'incorrect',
        moveNotation: incorrectNotation,
      });
    } else {
      onSelectedMoveChange({
        type: 'auto',
        moveNotation: formatMoveNotation(latestEntry),
      });
    }
  }, [moveLog, isCompleted, onSelectedMoveChange]);

  // Update parent component with selected move display (post-completion navigation)
  useEffect(() => {
    if (!onSelectedMoveChange) return;

    if (selectedMoveIndex === null) {
      if (!isCompleted) return;
      onSelectedMoveChange(null);
      return;
    }

    let entry: MoveLogEntry | null = null;
    let originalMoveCounter = 0;
    for (const logEntry of moveLog) {
      if (logEntry.status !== 'incorrect') {
        if (originalMoveCounter === selectedMoveIndex) {
          entry = logEntry;
          break;
        }
        originalMoveCounter++;
      }
    }

    if (!entry) {
      onSelectedMoveChange(null);
      return;
    }

    onSelectedMoveChange({
      type: 'navigated',
      moveNotation: formatMoveNotation(entry),
      evaluation: entry.evaluation
        ? { loss: entry.evaluation.loss, isMate: entry.evaluation.mate !== undefined }
        : undefined,
    });
  }, [selectedMoveIndex, moveLog, isCompleted, onSelectedMoveChange]);

  const currentFen = getCurrentFen() || gamePositions[0]?.fen;
  const totalMoves = originalMoves.length;
  const progress = currentMoveIndex;

  // Format moves for display
  const formattedPgn = useMemo(
    () => formatMovesToPgn(userMoves, startsAsBlack, startMoveNumber),
    [userMoves, startsAsBlack, startMoveNumber]
  );

  // Calculate last move for highlighting based on current position
  const currentLastMove = useMemo(() => {
    if (currentPosition === -2) return null;

    const posIndex = currentPosition === -1 ? userMoves.length : currentPosition + 1;

    if (posIndex <= 0 || posIndex >= gamePositions.length) return null;

    return gamePositions[posIndex].lastMove ?? null;
  }, [currentPosition, userMoves.length, gamePositions]);

  // Calculate evaluation mark for the current position
  const currentEvaluationMark = useMemo(
    () => getCurrentEvaluationMark(currentPosition, userMoves.length, currentLastMove, moveLog),
    [currentPosition, userMoves.length, currentLastMove, moveLog]
  );

  return {
    gameProgress: {
      originalMoves,
      currentMoveIndex,
      userMoves,
      isCompleted,
      totalMoves,
      progress,
    },
    boardState: {
      currentFen,
      displayFen,
      currentLastMove,
      currentEvaluationMark,
      gamePositions,
    },
    moveInput: {
      value: moveInputValue,
      setValue: setMoveInputValue,
      isEvaluating,
      isAnalyzingAll,
    },
    moveLog: {
      entries: moveLog,
      filteredEntries,
      hasAnyEvaluation,
    },
    settings: {
      autoOpponent,
      setAutoOpponent,
      showEvaluation,
      setShowEvaluation,
      dontKnowCount,
      isPlayerTurn: playerTurn,
    },
    navigation: {
      ...navigation,
    },
    filters: {
      value: filterValue,
      setValue: setFilters,
      reset: handleResetFilters,
    },
    actions: {
      handleSubmitMove,
      handleDontKnow,
      handleAnalyzeAll,
      handleMoveClick,
    },
    formattedPgn,
  };
}
