import { useCallback, useMemo, useState } from 'react';

import type { replayMoves } from '@blindfold-chess/features/chess-core';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { EvaluationMark } from '@/lib/games/evaluation';

import { getMovingSide } from '../../_lib/fen-utils';
import type { MoveLogEntry } from '../_lib';
import { isPlayerTurn as computeIsPlayerTurn, formatMovesToPgn } from '../_lib';
import { usePostmortemActions } from './use-postmortem-actions';
import { usePostmortemInit } from './use-postmortem-init';
import { usePostmortemNavigation } from './use-postmortem-navigation';

type Props = {
  pgn: string;
  playerColor: 'white' | 'black';
  autoOpponent: boolean;
  initialOffset?: number;
  startingFen?: string;
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
    isAnalyzingAll: boolean;
    lastFeedback: {
      type: 'correct' | 'incorrect' | 'skipped';
      moveNumber: number;
      isWhiteMove: boolean;
      move: string;
    } | null;
    clearFeedback: () => void;
  };
  moveLog: {
    entries: MoveLogEntry[];
  };
  settings: {
    autoOpponent: boolean;
    setAutoOpponent: (v: boolean) => void;
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
  actions: {
    handleSubmitMove: (move: AlgebraicNotation) => void;
    handleDontKnow: () => void;
    handleAnalyzeAll: () => void;
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
    isAnalyzingAll,
    dontKnowCount,
    lastFeedback,
    clearFeedback,
    handleSubmitMove: rawHandleSubmit,
    handleDontKnow: rawHandleDontKnow,
    handleAnalyzeAll,
  } = usePostmortemActions({
    originalMoves,
    userMoves,
    currentMoveIndex,
    moveLog,
    startsAsBlack,
    startMoveNumber,
    isPlayerTurn: playerTurn,
    autoOpponent,
    isCompleted,
    setUserMoves,
    setCurrentMoveIndex,
    setMoveLog,
    setIsCompleted,
  });

  const handleSubmitMove = useCallback(
    (move: AlgebraicNotation) => rawHandleSubmit(move, setMoveInputValue),
    [rawHandleSubmit]
  );

  const handleDontKnow = useCallback(
    () => rawHandleDontKnow(setMoveInputValue),
    [rawHandleDontKnow]
  );

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

  const currentEvaluationMark: EvaluationMark | null = null;

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
      isAnalyzingAll,
      lastFeedback,
      clearFeedback,
    },
    moveLog: {
      entries: moveLog,
    },
    settings: {
      autoOpponent,
      setAutoOpponent,
      dontKnowCount,
      isPlayerTurn: playerTurn,
    },
    navigation: {
      ...navigation,
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
