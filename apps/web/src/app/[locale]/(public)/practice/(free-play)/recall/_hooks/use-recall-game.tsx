import { useCallback, useMemo, useState } from 'react';

import type { replayMoves } from '@blindfold-chess/features/chess-core';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import { formatMovesToPgn } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { getMovingSide } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';

import type { MoveLogEntry } from '../_lib';
import { isPlayerTurn as computeIsPlayerTurn } from '../_lib';
import { useRecallActions } from './use-recall-actions';
import { useRecallInit } from './use-recall-init';
import { useRecallNavigation } from './use-recall-navigation';
import { useRecallSettings } from './use-recall-settings';

type Props = {
  pgn: string;
  /** Pre-parsed SAN move list, taking precedence over `pgn` when present. See `useRecallInit`. */
  moves?: AlgebraicNotation[];
  playerColor: Side;
  autoOpponent: boolean;
  initialOffset?: number;
  startingFen?: string;
};

type RecallGameReturn = {
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
  };
  formattedPgn: FormattedPgnMove[];
};

export function useRecallGame({
  pgn,
  moves,
  playerColor,
  autoOpponent: initialAutoOpponent,
  initialOffset = 0,
  startingFen,
}: Props): RecallGameReturn {
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
  } = useRecallInit({ pgn, moves, initialOffset, startingFen });

  // Local state
  const [moveInputValue, setMoveInputValue] = useState('');
  const { autoOpponent, setAutoOpponent } = useRecallSettings({
    initialAutoOpponent,
  });
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);

  // Hooks: Navigation
  const navigation = useRecallNavigation({
    originalMovesLength: originalMoves.length,
    gamePositions,
  });
  const { currentPosition, selectedMoveIndex, displayFen } = navigation;

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
  } = useRecallActions({
    originalMoves,
    userMoves,
    currentMoveIndex,
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
    },
    formattedPgn,
  };
}
