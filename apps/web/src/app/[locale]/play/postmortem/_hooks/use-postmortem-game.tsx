import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { replayMoves, validateMoveSequence } from '@blindfold-chess/features/chess-core';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaCheck, FaTimes } from 'react-icons/fa';

import type { EvaluationMark } from '@/lib/evaluation';
import { getEvaluationIcon } from '@/lib/evaluation';

import type { EvaluationFilters, MoveLogEntry } from '../_lib';
import { clearEvaluationCache, getPositionEvaluation } from '../_lib';

type Props = {
  pgn: string;
  playerColor: 'white' | 'black';
  autoOpponent: boolean;
  initialOffset?: number;
  startingFen?: string;
  onSelectedMoveChange?: (moveDisplay: ReactElement | null) => void;
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
  const t = useTranslations('postmortem');

  // State that lives in the hook
  const [originalMoves, setOriginalMoves] = useState<AlgebraicNotation[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(initialOffset);
  const [userMoves, setUserMoves] = useState<AlgebraicNotation[]>([]);
  const [moveInputValue, setMoveInputValue] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [autoOpponent, setAutoOpponent] = useState(initialAutoOpponent);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [dontKnowCount, setDontKnowCount] = useState(0);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);
  const [filters, setFilters] = useState<EvaluationFilters>({
    player: { own: true, opponent: true },
    evaluation: {
      best: true,
      good: true,
      inaccuracy: true,
      mistake: true,
      blunder: true,
    },
  });
  const [currentPosition, setCurrentPosition] = useState(-1);
  const [displayFen, setDisplayFen] = useState<string | null>(null);

  // Pre-compute starting position info from FEN
  const startsAsBlack = useMemo(
    () => (startingFen ? startingFen.split(' ')[1] === 'b' : false),
    [startingFen]
  );
  const startMoveNumber = useMemo(
    () => (startingFen ? parseInt(startingFen.split(' ')[5]) || 1 : 1),
    [startingFen]
  );

  // Parse PGN on mount and clear evaluation cache
  useEffect(() => {
    clearEvaluationCache();

    try {
      const cleanPgn = pgn.replace(/\d+\.\s*/g, '').replace(/\.\./g, '');
      const moves = cleanPgn.trim().split(/\s+/).filter(Boolean);

      const fen = startingFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const result = validateMoveSequence(fen, moves);
      const validMoves = result.validMoves as AlgebraicNotation[];

      setOriginalMoves(validMoves);

      if (initialOffset > 0 && initialOffset <= validMoves.length) {
        const restoredMoves = validMoves.slice(0, initialOffset);
        setUserMoves(restoredMoves);

        if (initialOffset >= validMoves.length) {
          setIsCompleted(true);
        }
      }
    } catch (error) {
      console.error('Error parsing PGN:', error);
    }
  }, [pgn, initialOffset, startingFen]);

  // Pre-compute all game positions
  const gamePositions = useMemo(() => {
    return replayMoves(originalMoves as string[], startingFen);
  }, [originalMoves, startingFen]);

  // Get current FEN for board display
  const getCurrentFen = useCallback(() => {
    if (selectedMoveIndex !== null) {
      return gamePositions[selectedMoveIndex + 1]?.fen ?? gamePositions[0].fen;
    }
    return gamePositions[userMoves.length]?.fen ?? gamePositions[0].fen;
  }, [userMoves.length, gamePositions, selectedMoveIndex]);

  // Navigation functions
  const navigateToPosition = useCallback(
    (position: number) => {
      if (position === -1 || position >= originalMoves.length) {
        setCurrentPosition(-1);
        setDisplayFen(null);
        setSelectedMoveIndex(null);
        return;
      }

      const posData = gamePositions[position + 1];
      if (posData) {
        setCurrentPosition(position);
        setDisplayFen(posData.fen);
        setSelectedMoveIndex(position);
      } else {
        setCurrentPosition(-1);
        setDisplayFen(null);
        setSelectedMoveIndex(null);
      }
    },
    [originalMoves.length, gamePositions]
  );

  const navigateToStart = useCallback(() => {
    setDisplayFen(gamePositions[0].fen);
    setCurrentPosition(-2);
    setSelectedMoveIndex(null);
  }, [gamePositions]);

  const navigateToEnd = useCallback(() => {
    setCurrentPosition(-1);
    setDisplayFen(null);
    setSelectedMoveIndex(null);
  }, []);

  const navigatePrevious = useCallback(() => {
    if (currentPosition === -2) {
      return;
    }

    if (currentPosition === -1) {
      if (originalMoves.length > 0) {
        navigateToPosition(originalMoves.length - 2);
      }
    } else if (currentPosition === 0) {
      navigateToStart();
    } else {
      navigateToPosition(currentPosition - 1);
    }
  }, [currentPosition, originalMoves.length, navigateToPosition, navigateToStart]);

  const navigateNext = useCallback(() => {
    if (currentPosition === -2) {
      if (originalMoves.length > 0) {
        navigateToPosition(0);
      }
    } else if (currentPosition === -1) {
      return;
    } else {
      const newPosition = currentPosition + 1;
      if (newPosition < originalMoves.length) {
        navigateToPosition(newPosition);
      }
    }
  }, [currentPosition, originalMoves.length, navigateToPosition]);

  // Check if current move is player's turn
  const isPlayerTurn = useMemo(() => {
    if (!autoOpponent) return true;

    const isStartingSideMove = currentMoveIndex % 2 === 0;
    const startingSide = startsAsBlack ? 'black' : 'white';
    const movingSide = isStartingSideMove
      ? startingSide
      : startingSide === 'white'
        ? 'black'
        : 'white';
    return movingSide === playerColor;
  }, [currentMoveIndex, playerColor, autoOpponent, startsAsBlack]);

  // Update URL with current offset
  useEffect(() => {
    if (originalMoves.length > 0 && currentMoveIndex > 0) {
      const params = new URLSearchParams(window.location.search);
      params.set('offset', currentMoveIndex.toString());
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentMoveIndex, originalMoves.length]);

  // Auto-fill opponent's move if needed
  useEffect(() => {
    if (
      autoOpponent &&
      !isPlayerTurn &&
      currentMoveIndex < originalMoves.length &&
      !isCompleted &&
      !isEvaluating
    ) {
      const autoFillMove = async () => {
        setIsEvaluating(true);
        const opponentMove = originalMoves[currentMoveIndex];
        const moveNumber = startsAsBlack
          ? startMoveNumber + Math.floor((currentMoveIndex + 1) / 2)
          : startMoveNumber + Math.floor(currentMoveIndex / 2);
        const isWhiteMove = startsAsBlack ? currentMoveIndex % 2 === 1 : currentMoveIndex % 2 === 0;
        const newIndex = currentMoveIndex + 1;

        setUserMoves((prev) => [...prev, opponentMove]);
        setCurrentMoveIndex(newIndex);

        const previousEval =
          moveLog.length > 0 && moveLog[moveLog.length - 1].evaluation
            ? {
                score: moveLog[moveLog.length - 1].evaluation!.score,
                mate: moveLog[moveLog.length - 1].evaluation!.mate,
                bestMove: moveLog[moveLog.length - 1].evaluation!.nextBestMove,
              }
            : undefined;

        const evaluation = showEvaluation
          ? await getPositionEvaluation(
              gamePositions[currentMoveIndex].fen,
              gamePositions[currentMoveIndex + 1].fen,
              currentMoveIndex,
              t,
              previousEval
            )
          : undefined;

        setMoveLog((prev) => [
          ...prev,
          {
            moveNumber,
            isWhiteMove,
            move: opponentMove,
            status: 'auto',
            evaluation,
          },
        ]);

        if (newIndex >= originalMoves.length) {
          setIsCompleted(true);
        }

        setIsEvaluating(false);
      };

      autoFillMove();
    }
  }, [
    autoOpponent,
    isPlayerTurn,
    currentMoveIndex,
    originalMoves,
    isCompleted,
    isEvaluating,
    showEvaluation,
    t,
    moveLog,
    gamePositions,
  ]);

  // Handle move submission
  const handleSubmitMove = useCallback(
    async (move: AlgebraicNotation) => {
      if (isEvaluating) return;

      const expectedMove = originalMoves[currentMoveIndex];
      const moveNumber = startsAsBlack
        ? startMoveNumber + Math.floor((currentMoveIndex + 1) / 2)
        : startMoveNumber + Math.floor(currentMoveIndex / 2);
      const isWhiteMove = startsAsBlack ? currentMoveIndex % 2 === 1 : currentMoveIndex % 2 === 0;

      if (move === expectedMove) {
        setIsEvaluating(true);

        const newIndex = currentMoveIndex + 1;
        setUserMoves((prev) => [...prev, move]);
        setCurrentMoveIndex(newIndex);
        setMoveInputValue('');

        const previousEval =
          moveLog.length > 0 && moveLog[moveLog.length - 1].evaluation
            ? {
                score: moveLog[moveLog.length - 1].evaluation!.score,
                mate: moveLog[moveLog.length - 1].evaluation!.mate,
                bestMove: moveLog[moveLog.length - 1].evaluation!.nextBestMove,
              }
            : undefined;

        const evaluation = showEvaluation
          ? await getPositionEvaluation(
              gamePositions[currentMoveIndex].fen,
              gamePositions[currentMoveIndex + 1].fen,
              currentMoveIndex,
              t,
              previousEval
            )
          : undefined;

        setMoveLog((prev) => [
          ...prev,
          {
            moveNumber,
            isWhiteMove,
            move,
            status: 'correct',
            evaluation,
          },
        ]);

        if (newIndex >= originalMoves.length) {
          setIsCompleted(true);
        }

        setIsEvaluating(false);
      } else {
        setMoveLog((prev) => [
          ...prev,
          {
            moveNumber,
            isWhiteMove,
            move: expectedMove,
            status: 'incorrect',
            incorrectMove: move,
          },
        ]);
      }
    },
    [
      currentMoveIndex,
      originalMoves,
      showEvaluation,
      isEvaluating,
      t,
      moveLog,
      gamePositions,
      startsAsBlack,
      startMoveNumber,
    ]
  );

  // Handle "I don't know" button
  const handleDontKnow = useCallback(async () => {
    if (isEvaluating) return;

    setIsEvaluating(true);
    setDontKnowCount((prev) => prev + 1);

    const correctMove = originalMoves[currentMoveIndex];
    const moveNumber = startsAsBlack
      ? startMoveNumber + Math.floor((currentMoveIndex + 1) / 2)
      : startMoveNumber + Math.floor(currentMoveIndex / 2);
    const isWhiteMove = startsAsBlack ? currentMoveIndex % 2 === 1 : currentMoveIndex % 2 === 0;
    const newIndex = currentMoveIndex + 1;

    setUserMoves((prev) => [...prev, correctMove]);
    setCurrentMoveIndex(newIndex);
    setMoveInputValue('');

    const evaluation = showEvaluation
      ? await getPositionEvaluation(
          gamePositions[currentMoveIndex].fen,
          gamePositions[currentMoveIndex + 1].fen,
          currentMoveIndex,
          t,
          undefined
        )
      : undefined;

    setMoveLog((prev) => [
      ...prev,
      {
        moveNumber,
        isWhiteMove,
        move: correctMove,
        status: 'auto',
        evaluation,
      },
    ]);

    if (newIndex >= originalMoves.length) {
      setIsCompleted(true);
    }

    setIsEvaluating(false);
  }, [
    currentMoveIndex,
    originalMoves,
    showEvaluation,
    isEvaluating,
    t,
    gamePositions,
    startsAsBlack,
    startMoveNumber,
  ]);

  // Handle "Analyze All" button
  const handleAnalyzeAll = useCallback(async () => {
    if (isEvaluating) return;

    setIsEvaluating(true);
    setIsAnalyzingAll(true);

    const remainingMoves = originalMoves.slice(currentMoveIndex);
    const newMoves = [...userMoves, ...remainingMoves];
    setUserMoves(newMoves);

    const newLogEntries: MoveLogEntry[] = [];
    let previousEval =
      moveLog.length > 0 && moveLog[moveLog.length - 1].evaluation
        ? {
            score: moveLog[moveLog.length - 1].evaluation!.score,
            mate: moveLog[moveLog.length - 1].evaluation!.mate,
            bestMove: moveLog[moveLog.length - 1].evaluation!.nextBestMove,
          }
        : undefined;

    for (let i = currentMoveIndex; i < originalMoves.length; i++) {
      const move = originalMoves[i];
      const moveNumber = startsAsBlack
        ? startMoveNumber + Math.floor((i + 1) / 2)
        : startMoveNumber + Math.floor(i / 2);
      const isWhiteMove = startsAsBlack ? i % 2 === 1 : i % 2 === 0;

      const evaluation = showEvaluation
        ? await getPositionEvaluation(
            gamePositions[i].fen,
            gamePositions[i + 1].fen,
            i,
            t,
            previousEval
          )
        : undefined;

      if (evaluation) {
        previousEval = {
          score: evaluation.score,
          mate: evaluation.mate,
          bestMove: evaluation.nextBestMove,
        };
      }

      newLogEntries.push({
        moveNumber,
        isWhiteMove,
        move,
        status: 'auto',
        evaluation,
      });
    }

    setMoveLog((prev) => [...prev, ...newLogEntries]);
    setCurrentMoveIndex(originalMoves.length);
    setIsCompleted(true);
    setIsEvaluating(false);
    setIsAnalyzingAll(false);
  }, [
    currentMoveIndex,
    originalMoves,
    userMoves,
    moveLog,
    showEvaluation,
    isEvaluating,
    t,
    gamePositions,
    startsAsBlack,
    startMoveNumber,
  ]);

  // Check if any move has evaluation
  const hasAnyEvaluation = useMemo(() => {
    return moveLog.some((entry) => entry.evaluation !== undefined);
  }, [moveLog]);

  // Filter move log based on selected filters
  const filteredEntries = useMemo(() => {
    return moveLog.filter((entry) => {
      const isOwnMove =
        (playerColor === 'white' && entry.isWhiteMove) ||
        (playerColor === 'black' && !entry.isWhiteMove);
      if (isOwnMove && !filters.player.own) return false;
      if (!isOwnMove && !filters.player.opponent) return false;

      const hasAnyEvaluationFilterDisabled = !Object.values(filters.evaluation).every((v) => v);

      if (entry.status !== 'incorrect') {
        if (entry.evaluation) {
          const loss = entry.evaluation.loss;
          if (loss <= 20 && !filters.evaluation.best) return false;
          if (loss > 20 && loss <= 50 && !filters.evaluation.good) return false;
          if (loss > 50 && loss <= 100 && !filters.evaluation.inaccuracy) return false;
          if (loss > 100 && loss <= 300 && !filters.evaluation.mistake) return false;
          if (loss > 300 && !filters.evaluation.blunder) return false;
        } else if (hasAnyEvaluationFilterDisabled) {
          return false;
        }
      }

      return true;
    });
  }, [moveLog, filters, playerColor]);

  // Handle filter reset
  const handleResetFilters = useCallback(() => {
    setFilters({
      player: { own: true, opponent: true },
      evaluation: {
        best: true,
        good: true,
        inaccuracy: true,
        mistake: true,
        blunder: true,
      },
    });
  }, []);

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
    const moveNotation = latestEntry.isWhiteMove
      ? `${latestEntry.moveNumber}. ${latestEntry.move}`
      : `${latestEntry.moveNumber}... ${latestEntry.move}`;

    let displayElement: ReactElement;

    if (latestEntry.status === 'correct') {
      displayElement = (
        <span className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
          <FaCheck className="w-4 h-4" /> {moveNotation}
        </span>
      );
    } else if (latestEntry.status === 'incorrect') {
      const incorrectNotation = latestEntry.isWhiteMove
        ? `${latestEntry.moveNumber}. ${latestEntry.incorrectMove}`
        : `${latestEntry.moveNumber}... ${latestEntry.incorrectMove}`;
      displayElement = (
        <span className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
          <FaTimes className="w-4 h-4" /> {incorrectNotation}
        </span>
      );
    } else {
      displayElement = <span className="text-muted-foreground">{moveNotation}</span>;
    }

    onSelectedMoveChange(displayElement);
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

    const moveNotation = entry.isWhiteMove
      ? `${entry.moveNumber}. ${entry.move}`
      : `${entry.moveNumber}... ${entry.move}`;

    const displayElement = (
      <span className="flex items-center gap-2">
        {moveNotation}
        {entry.evaluation &&
          getEvaluationIcon(entry.evaluation.loss, entry.evaluation.mate !== undefined, 'sm')}
      </span>
    );

    onSelectedMoveChange(displayElement);
  }, [selectedMoveIndex, moveLog, isCompleted, onSelectedMoveChange]);

  const currentFen = getCurrentFen();
  const totalMoves = originalMoves.length;
  const progress = currentMoveIndex;

  // Format moves for display (bug fix: changed from useCallback to useMemo)
  const formattedPgn = useMemo((): FormattedPgnMove[] => {
    if (userMoves.length === 0) return [];

    const formatted: FormattedPgnMove[] = [];

    if (startsAsBlack) {
      formatted.push({
        moveNumber: startMoveNumber,
        blackMove: userMoves[0],
        blackMoveIndex: 0,
      });
      for (let i = 1; i < userMoves.length; i += 2) {
        const moveNumber = startMoveNumber + Math.floor((i + 1) / 2);
        formatted.push({
          moveNumber,
          whiteMove: userMoves[i],
          whiteMoveIndex: i,
          blackMove: userMoves[i + 1],
          blackMoveIndex: userMoves[i + 1] !== undefined ? i + 1 : undefined,
        });
      }
    } else {
      for (let i = 0; i < userMoves.length; i += 2) {
        const moveNumber = startMoveNumber + Math.floor(i / 2);
        formatted.push({
          moveNumber,
          whiteMove: userMoves[i],
          whiteMoveIndex: i,
          blackMove: userMoves[i + 1],
          blackMoveIndex: userMoves[i + 1] !== undefined ? i + 1 : undefined,
        });
      }
    }

    return formatted;
  }, [userMoves, startsAsBlack, startMoveNumber]);

  // Calculate last move for highlighting based on current position
  const currentLastMove = useMemo(() => {
    if (currentPosition === -2) return null;

    const posIndex = currentPosition === -1 ? userMoves.length : currentPosition + 1;

    if (posIndex <= 0 || posIndex >= gamePositions.length) return null;

    return gamePositions[posIndex].lastMove ?? null;
  }, [currentPosition, userMoves.length, gamePositions]);

  // Calculate evaluation mark for the current position
  const currentEvaluationMark = useMemo((): EvaluationMark | null => {
    if (!currentLastMove) return null;

    const moveIndex =
      currentPosition === -1 ? userMoves.length - 1 : currentPosition === -2 ? -1 : currentPosition;

    if (moveIndex < 0) return null;

    let actualMoveCount = 0;
    for (const entry of moveLog) {
      if (entry.status !== 'incorrect') {
        if (actualMoveCount === moveIndex && entry.evaluation) {
          return {
            square: currentLastMove.to,
            loss: entry.evaluation.loss,
            isMate: entry.evaluation.mate !== undefined,
          };
        }
        actualMoveCount++;
      }
    }

    return null;
  }, [currentPosition, userMoves.length, currentLastMove, moveLog]);

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
      isPlayerTurn,
    },
    navigation: {
      currentPosition,
      selectedMoveIndex,
      setSelectedMoveIndex,
      navigateToPosition,
      navigateToStart,
      navigateToEnd,
      navigatePrevious,
      navigateNext,
    },
    filters: {
      value: filters,
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
