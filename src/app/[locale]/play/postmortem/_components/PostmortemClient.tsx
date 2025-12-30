'use client';

import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button, ChessBoard, InfoModal, ProgressBar } from '@/app/_components';
import { Chess } from 'chess.js';
import {
  FaCheck,
  FaChevronDown,
  FaCopy,
  FaExternalLinkAlt,
  FaEye,
  FaEyeSlash,
  FaFilter,
  FaInfoCircle,
  FaQuestionCircle,
  FaSpinner,
  FaStar,
} from 'react-icons/fa';

import { fenToLichessUrl } from '@/lib/lichess';
import type { AlgebraicNotation } from '@/lib/types';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { GameSettingsModal } from '@/app/[locale]/play/_components/GameSettingsModal';
import { MoveInput } from '@/app/[locale]/play/_components/MoveInput';
import { MoveNavigationControls } from '@/app/[locale]/play/_components/MoveNavigationControls';
import { MoveSelect } from '@/app/[locale]/play/_components/MoveSelect';
import { getChessEngine } from '@/app/[locale]/play/_lib/chess-engine';
import { formatPgnToText } from '@/app/[locale]/play/_lib/pgn-parser';

type Props = {
  pgn: string;
  playerColor: 'white' | 'black';
  autoOpponent: boolean;
  initialOffset?: number;
  onSelectedMoveChange?: (moveDisplay: ReactElement | null) => void;
};

type MoveLogEntry = {
  moveNumber: number;
  isWhiteMove: boolean;
  move: string;
  status: 'correct' | 'incorrect' | 'auto'; // correct: 正解, incorrect: 間違い, auto: 自動入力
  incorrectMove?: string; // 間違えた場合のユーザーの入力
  evaluation?: {
    score: number;
    mate?: number;
    text: string; // 最善です, 好手です, etc.
    loss: number; // Evaluation loss from this move (centipawns)
    bestMove?: string; // Best move in algebraic notation (if not the best)
    nextBestMove?: string; // Best move from evalAfter (for next evaluation)
  };
};

// Helper function to get evaluation text based on evaluation loss
// loss is the absolute difference from the previous position (always positive)
function getEvaluationText(t: (key: string) => string, loss: number): string {
  if (loss <= 20) return t('evalBest');
  if (loss <= 50) return t('evalGood');
  if (loss <= 100) return t('evalInaccuracy');
  if (loss <= 300) return t('evalMistake');
  return t('evalBlunder');
}

// Helper function to get evaluation icon based on evaluation loss (chess.com style)
function getEvaluationIcon(loss: number, isMate: boolean = false): ReactElement | null {
  if (isMate) {
    // Checkmate - star (same as best move)
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
        <FaStar className="w-2 h-2 text-white" />
      </span>
    );
  }

  if (loss <= 20) {
    // Best move - star with green background
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
        <FaStar className="w-2 h-2 text-white" />
      </span>
    );
  }
  if (loss <= 50) {
    // Good move - checkmark with green background and white text
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
        <FaCheck className="w-2 h-2 text-white" />
      </span>
    );
  }
  if (loss <= 100) {
    // Inaccuracy - ?! with yellow background
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-white text-[10px] font-bold">
        ?!
      </span>
    );
  }
  if (loss <= 300) {
    // Mistake - ? with orange background
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold">
        ?
      </span>
    );
  }
  // Blunder - ?? with red background
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
      ??
    </span>
  );
}

// Cache for position evaluations to avoid re-evaluating the same position
const evaluationCache = new Map<string, { score: number; mate?: number; bestMove?: string }>();

// Helper function to get evaluation from engine
async function getPositionEvaluation(
  moves: AlgebraicNotation[],
  moveIndex: number,
  t: (key: string) => string,
  previousEval?: { score: number; mate?: number; bestMove?: string } // Pass previous evaluation to avoid re-calculation
): Promise<
  | {
      score: number;
      mate?: number;
      text: string;
      loss: number; // Evaluation loss from this move
      bestMove?: string; // Best move in algebraic notation (if not the best)
      nextBestMove?: string; // Best move from evalAfter (for next evaluation)
    }
  | undefined
> {
  try {
    const engine = getChessEngine();

    // Wait for engine to be ready
    let retries = 0;
    const maxRetries = 50; // 5 seconds max
    while (!engine.isReady && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (!engine.isReady) {
      return undefined;
    }

    // Get evaluation BEFORE the move (use cached value if available)
    let evalBefore: { score: number; mate?: number; bestMove?: string };

    if (previousEval) {
      // Use the previous evaluation (which is the position before this move)
      evalBefore = previousEval;
    } else {
      // First move - evaluate the starting position
      const chessBefore = new Chess();
      for (let i = 0; i < moveIndex; i++) {
        chessBefore.move(moves[i]);
      }
      const fenBefore = chessBefore.fen();

      // Check cache
      if (evaluationCache.has(fenBefore)) {
        evalBefore = evaluationCache.get(fenBefore)!;
      } else {
        evalBefore = await engine.getEvaluation(fenBefore, 12);
        evaluationCache.set(fenBefore, evalBefore);
      }
    }

    // Get evaluation AFTER the move
    const chessAfter = new Chess();
    for (let i = 0; i <= moveIndex; i++) {
      chessAfter.move(moves[i]);
    }
    const fenAfter = chessAfter.fen();

    let evalAfter: { score: number; mate?: number; bestMove?: string };
    if (evaluationCache.has(fenAfter)) {
      evalAfter = evaluationCache.get(fenAfter)!;
    } else {
      evalAfter = await engine.getEvaluation(fenAfter, 12);
      evaluationCache.set(fenAfter, evalAfter);
    }

    // Calculate evaluation loss
    // For white's move: loss = evalBefore - evalAfter (positive means worse for white)
    // For black's move: loss = evalAfter - evalBefore (positive means worse for black)
    const isWhiteMove = moveIndex % 2 === 0;
    let loss: number;

    if (evalAfter.mate !== undefined) {
      // If there's a mate, consider it a best move (0 loss)
      loss = 0;
    } else if (evalBefore.mate !== undefined) {
      // If we had a mate and lost it, that's a big blunder
      loss = 1000;
    } else {
      // Normal case: calculate centipawn loss
      if (isWhiteMove) {
        // White wants higher scores, so loss = before - after
        loss = evalBefore.score - evalAfter.score;
      } else {
        // Black wants lower scores, so loss = after - before
        loss = evalAfter.score - evalBefore.score;
      }
      // Ensure loss is non-negative
      loss = Math.max(0, loss);
    }

    // Convert best move from UCI to algebraic notation if available and loss is significant
    let bestMoveAlgebraic: string | undefined;
    if (evalBefore.bestMove && loss > 20) {
      // Only show best move if loss > 20 centipawns (not a best move)
      try {
        const chessBefore = new Chess();
        for (let i = 0; i < moveIndex; i++) {
          chessBefore.move(moves[i]);
        }
        const fenBefore = chessBefore.fen();

        // Check if bestMove is in UCI format (e.g., "e2e4") or already in algebraic notation
        const isUciFormat = /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(evalBefore.bestMove);

        if (isUciFormat) {
          bestMoveAlgebraic = engine.convertUciToAlgebraic(
            evalBefore.bestMove as `${string}${number}${string}${number}`,
            fenBefore
          );
        } else {
          // Already in algebraic notation, verify it's valid
          const testMove = chessBefore.move(evalBefore.bestMove);
          if (testMove) {
            bestMoveAlgebraic = testMove.san;
          }
        }
      } catch (error) {
        console.warn('Failed to convert best move to algebraic:', error);
      }
    }

    return {
      score: evalAfter.score,
      mate: evalAfter.mate,
      text: getEvaluationText(t, loss),
      loss,
      bestMove: bestMoveAlgebraic,
      // Store the engine's bestMove from evalAfter for the next evaluation
      nextBestMove: evalAfter.bestMove,
    };
  } catch (error) {
    // Silently handle evaluation errors (e.g., timeout in background tabs)
    // This is expected behavior and doesn't affect the core postmortem functionality
    if (error instanceof Error && error.message !== 'Evaluation timeout') {
      console.warn('Evaluation skipped:', error.message);
    }
  }
  return undefined;
}

export function PostmortemClient({
  pgn,
  playerColor,
  autoOpponent: initialAutoOpponent,
  initialOffset = 0,
  onSelectedMoveChange,
}: Props) {
  const t = useTranslations('postmortem');
  const { preferences } = useGamePreferences();

  // Parse PGN to get original moves
  const [originalMoves, setOriginalMoves] = useState<AlgebraicNotation[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(initialOffset);
  const [userMoves, setUserMoves] = useState<AlgebraicNotation[]>([]);
  const [moveInput, setMoveInput] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [autoOpponent, setAutoOpponent] = useState(initialAutoOpponent);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [showEvalInfo, setShowEvalInfo] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFenCopied, setIsFenCopied] = useState(false);
  const [dontKnowCount, setDontKnowCount] = useState(0);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    player: { own: true, opponent: true },
    evaluation: {
      best: true,
      good: true,
      inaccuracy: true,
      mistake: true,
      blunder: true,
    },
  });
  const [currentPosition, setCurrentPosition] = useState(-1); // -1 means latest position
  const [displayFen, setDisplayFen] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Parse PGN on mount and clear evaluation cache
  useEffect(() => {
    // Clear evaluation cache when component mounts or pgn changes
    evaluationCache.clear();

    try {
      const chess = new Chess();
      // Remove move numbers and periods from PGN
      const cleanPgn = pgn.replace(/\d+\.\s*/g, '').replace(/\.\./g, '');
      const moves = cleanPgn.trim().split(/\s+/).filter(Boolean);

      // Validate moves
      const validMoves: AlgebraicNotation[] = [];
      for (const move of moves) {
        const result = chess.move(move);
        if (result) {
          validMoves.push(move as AlgebraicNotation);
        } else {
          break;
        }
      }

      setOriginalMoves(validMoves);

      // Restore moves from offset
      if (initialOffset > 0 && initialOffset <= validMoves.length) {
        const restoredMoves = validMoves.slice(0, initialOffset);
        setUserMoves(restoredMoves);

        // If offset reaches the end, mark as completed
        if (initialOffset >= validMoves.length) {
          setIsCompleted(true);
        }
      }
    } catch (error) {
      console.error('Error parsing PGN:', error);
    }
  }, [pgn, initialOffset]);

  // Get current FEN for board display
  const getCurrentFen = useCallback(() => {
    const chess = new Chess();
    // If a move is selected for review, show that position
    const movesToShow = selectedMoveIndex !== null ? selectedMoveIndex + 1 : userMoves.length;
    const moves = selectedMoveIndex !== null ? originalMoves : userMoves;

    for (let i = 0; i < movesToShow; i++) {
      chess.move(moves[i]);
    }
    return chess.fen();
  }, [userMoves, originalMoves, selectedMoveIndex]);

  // Navigation functions for move history
  const navigateToPosition = useCallback(
    (position: number) => {
      const chess = new Chess();

      // Reset board
      if (position === -1 || position >= originalMoves.length) {
        // Show latest position
        setCurrentPosition(-1);
        setDisplayFen(null);
        setSelectedMoveIndex(null);
        return;
      }

      // Apply moves up to the specified position
      const movesToApply = originalMoves.slice(0, position + 1);
      try {
        for (const move of movesToApply) {
          chess.move(move);
        }
        setCurrentPosition(position);
        setDisplayFen(chess.fen());
        setSelectedMoveIndex(position);
      } catch (error) {
        console.error('Error navigating to position:', error);
        setCurrentPosition(-1);
        setDisplayFen(null);
        setSelectedMoveIndex(null);
      }
    },
    [originalMoves]
  );

  const navigateToStart = useCallback(() => {
    // Show initial position (before any moves)
    const chess = new Chess();
    setDisplayFen(chess.fen());
    setCurrentPosition(-2); // Special value to indicate start position
    setSelectedMoveIndex(null);
  }, []);

  const navigateToEnd = useCallback(() => {
    setCurrentPosition(-1);
    setDisplayFen(null);
    setSelectedMoveIndex(null);
  }, []);

  const navigatePrevious = useCallback(() => {
    if (currentPosition === -2) {
      // Already at start, can't go back further
      return;
    }

    if (currentPosition === -1) {
      // From latest position, go to the move before the last
      if (originalMoves.length > 0) {
        navigateToPosition(originalMoves.length - 2);
      }
    } else if (currentPosition === 0) {
      // From first move, go to start position
      navigateToStart();
    } else {
      // Normal navigation
      navigateToPosition(currentPosition - 1);
    }
  }, [currentPosition, originalMoves.length, navigateToPosition, navigateToStart]);

  const navigateNext = useCallback(() => {
    if (currentPosition === -2) {
      // From start position, go to first move
      if (originalMoves.length > 0) {
        navigateToPosition(0);
      }
    } else if (currentPosition === -1) {
      // Already at latest position, can't go forward
      return;
    } else {
      const newPosition = currentPosition + 1;
      if (newPosition < originalMoves.length) {
        navigateToPosition(newPosition);
      }
    }
  }, [currentPosition, originalMoves.length, navigateToPosition]);

  // Check if current move is player's turn
  const isPlayerTurn = useCallback(() => {
    // If autoOpponent is disabled, player enters all moves
    if (!autoOpponent) return true;

    const isWhiteTurn = currentMoveIndex % 2 === 0;
    return (playerColor === 'white' && isWhiteTurn) || (playerColor === 'black' && !isWhiteTurn);
  }, [currentMoveIndex, playerColor, autoOpponent]);

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
      !isPlayerTurn() &&
      currentMoveIndex < originalMoves.length &&
      !isCompleted &&
      !isEvaluating // Don't auto-fill while evaluating
    ) {
      const autoFillMove = async () => {
        setIsEvaluating(true);
        // Auto-fill opponent's move
        const opponentMove = originalMoves[currentMoveIndex];
        const moveNumber = Math.floor(currentMoveIndex / 2) + 1;
        const isWhiteMove = currentMoveIndex % 2 === 0;
        const newIndex = currentMoveIndex + 1;

        setUserMoves((prev) => [...prev, opponentMove]);
        setCurrentMoveIndex(newIndex);

        // Get evaluation if enabled
        // Get previous evaluation from the last log entry (if exists)
        const previousEval =
          moveLog.length > 0 && moveLog[moveLog.length - 1].evaluation
            ? {
                score: moveLog[moveLog.length - 1].evaluation!.score,
                mate: moveLog[moveLog.length - 1].evaluation!.mate,
                bestMove: moveLog[moveLog.length - 1].evaluation!.nextBestMove,
              }
            : undefined;

        const evaluation = showEvaluation
          ? await getPositionEvaluation(originalMoves, currentMoveIndex, t, previousEval)
          : undefined;

        // Add to log as auto-filled (opponent's move)
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

        // Check if completed after auto-fill
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
  ]);

  // Handle move submission
  const handleSubmitMove = useCallback(
    async (move: AlgebraicNotation) => {
      if (isEvaluating) return; // Prevent submission while evaluating

      const expectedMove = originalMoves[currentMoveIndex];
      const moveNumber = Math.floor(currentMoveIndex / 2) + 1;
      const isWhiteMove = currentMoveIndex % 2 === 0;

      if (move === expectedMove) {
        setIsEvaluating(true);

        // Correct move
        const newIndex = currentMoveIndex + 1;
        setUserMoves((prev) => [...prev, move]);
        setCurrentMoveIndex(newIndex);
        setMoveInput('');

        // Get evaluation if enabled
        // Get previous evaluation from the last log entry (if exists)
        const previousEval =
          moveLog.length > 0 && moveLog[moveLog.length - 1].evaluation
            ? {
                score: moveLog[moveLog.length - 1].evaluation!.score,
                mate: moveLog[moveLog.length - 1].evaluation!.mate,
                bestMove: moveLog[moveLog.length - 1].evaluation!.nextBestMove,
              }
            : undefined;

        const evaluation = showEvaluation
          ? await getPositionEvaluation(originalMoves, currentMoveIndex, t, previousEval)
          : undefined;

        // Add to log
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

        // Check if completed
        if (newIndex >= originalMoves.length) {
          setIsCompleted(true);
        }

        setIsEvaluating(false);
      } else {
        // Incorrect move - add to log but don't advance
        setMoveLog((prev) => [
          ...prev,
          {
            moveNumber,
            isWhiteMove,
            move: expectedMove, // Show the correct move
            status: 'incorrect',
            incorrectMove: move, // Store the incorrect move user entered
          },
        ]);
      }
    },
    [currentMoveIndex, originalMoves, showEvaluation, isEvaluating, t, moveLog]
  );

  // Handle "I don't know" button
  const handleDontKnow = useCallback(async () => {
    if (isEvaluating) return; // Prevent action while evaluating

    setIsEvaluating(true);
    setDontKnowCount((prev) => prev + 1);

    const correctMove = originalMoves[currentMoveIndex];
    const moveNumber = Math.floor(currentMoveIndex / 2) + 1;
    const isWhiteMove = currentMoveIndex % 2 === 0;
    const newIndex = currentMoveIndex + 1;

    setUserMoves((prev) => [...prev, correctMove]);
    setCurrentMoveIndex(newIndex);
    setMoveInput('');

    // Get evaluation if enabled
    const evaluation = showEvaluation
      ? await getPositionEvaluation(originalMoves, currentMoveIndex, t)
      : undefined;

    // Add to log as auto-filled
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

    // Check if completed
    if (newIndex >= originalMoves.length) {
      setIsCompleted(true);
    }

    setIsEvaluating(false);
  }, [currentMoveIndex, originalMoves, showEvaluation, isEvaluating, t]);

  // Handle "Analyze All" button
  const handleAnalyzeAll = useCallback(async () => {
    if (isEvaluating) return;

    setIsEvaluating(true);
    setIsAnalyzingAll(true);

    // Auto-fill all remaining moves
    const remainingMoves = originalMoves.slice(currentMoveIndex);
    const newMoves = [...userMoves, ...remainingMoves];
    setUserMoves(newMoves);

    // Add all remaining moves to log with evaluation if enabled
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
      const moveNumber = Math.floor(i / 2) + 1;
      const isWhiteMove = i % 2 === 0;

      const evaluation = showEvaluation
        ? await getPositionEvaluation(originalMoves, i, t, previousEval)
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
  }, [currentMoveIndex, originalMoves, userMoves, moveLog, showEvaluation, isEvaluating, t]);

  // Check if any move has evaluation
  const hasAnyEvaluation = useCallback(() => {
    return moveLog.some((entry) => entry.evaluation !== undefined);
  }, [moveLog]);

  // Filter move log based on selected filters
  const getFilteredMoveLog = useCallback(() => {
    return moveLog.filter((entry) => {
      // Check player filter
      const isOwnMove =
        (playerColor === 'white' && entry.isWhiteMove) ||
        (playerColor === 'black' && !entry.isWhiteMove);
      if (isOwnMove && !filters.player.own) return false;
      if (!isOwnMove && !filters.player.opponent) return false;

      // Check evaluation filter
      // If any evaluation filter is disabled, hide moves without evaluation
      const hasAnyEvaluationFilterDisabled = !Object.values(filters.evaluation).every((v) => v);

      if (entry.status !== 'incorrect') {
        if (entry.evaluation) {
          // Has evaluation - check against filters
          const loss = entry.evaluation.loss;
          if (loss <= 20 && !filters.evaluation.best) return false;
          if (loss > 20 && loss <= 50 && !filters.evaluation.good) return false;
          if (loss > 50 && loss <= 100 && !filters.evaluation.inaccuracy) return false;
          if (loss > 100 && loss <= 300 && !filters.evaluation.mistake) return false;
          if (loss > 300 && !filters.evaluation.blunder) return false;
        } else if (hasAnyEvaluationFilterDisabled) {
          // No evaluation and some filters are disabled - hide this move
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
      // Calculate the correct index in originalMoves
      // Incorrect entries don't correspond to moves in originalMoves
      let originalMoveIndex = 0;
      for (const logEntry of moveLog) {
        if (logEntry === entry) {
          if (entry.status === 'incorrect') {
            // For incorrect entries, navigate to the position before this move was attempted
            if (originalMoveIndex > 0) {
              navigateToPosition(originalMoveIndex - 1);
            } else {
              navigateToStart();
            }
            return;
          }
          // Use navigateToPosition to update all states consistently
          // (currentPosition, displayFen, selectedMoveIndex)
          navigateToPosition(originalMoveIndex);
          return;
        }
        // Only increment for correct/auto entries (moves that were actually made)
        if (logEntry.status !== 'incorrect') {
          originalMoveIndex++;
        }
      }
    },
    [moveLog, navigateToPosition, navigateToStart]
  );

  // Update parent component with selected move display
  useEffect(() => {
    if (!onSelectedMoveChange) return;

    if (selectedMoveIndex === null) {
      onSelectedMoveChange(null);
      return;
    }

    // Find the correct moveLog entry that corresponds to selectedMoveIndex
    // selectedMoveIndex is an index into originalMoves, not moveLog
    // We need to find the moveLog entry by counting non-incorrect entries
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

    // Create display element with evaluation icon if available
    const displayElement = (
      <span className="flex items-center gap-2">
        {moveNotation}
        {entry.evaluation &&
          getEvaluationIcon(entry.evaluation.loss, entry.evaluation.mate !== undefined)}
      </span>
    );

    onSelectedMoveChange(displayElement);
  }, [selectedMoveIndex, moveLog, onSelectedMoveChange]);

  const currentFen = getCurrentFen();
  const totalMoves = originalMoves.length;
  const progress = currentMoveIndex;

  // Format moves for display (like in PlayClient)
  const getFormattedPgn = useCallback(() => {
    const formatted: { moveNumber: number; whiteMove: string; blackMove?: string }[] = [];
    for (let i = 0; i < userMoves.length; i += 2) {
      formatted.push({
        moveNumber: Math.floor(i / 2) + 1,
        whiteMove: userMoves[i],
        blackMove: userMoves[i + 1],
      });
    }
    return formatted;
  }, [userMoves]);

  const formattedPgn = getFormattedPgn();

  // Calculate last move for highlighting based on current position
  const currentLastMove = useMemo(() => {
    // No highlight for start position
    if (currentPosition === -2) return null;

    // Determine which moves to use and how many
    const movesToCheck =
      currentPosition === -1 ? userMoves : originalMoves.slice(0, currentPosition + 1);

    if (movesToCheck.length === 0) return null;

    try {
      const chess = new Chess();
      let lastMoveDetails: { from: string; to: string } | null = null;

      for (let i = 0; i < movesToCheck.length; i++) {
        const move = chess.move(movesToCheck[i]);
        if (i === movesToCheck.length - 1 && move) {
          lastMoveDetails = { from: move.from, to: move.to };
        }
      }

      return lastMoveDetails;
    } catch (error) {
      console.error('Error getting last move details:', error);
      return null;
    }
  }, [currentPosition, userMoves, originalMoves]);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-lg">
            {/* Board Toggle Header */}
            <button
              onClick={() => setIsBoardVisible(!isBoardVisible)}
              className={`w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border/50 focus:ring-inset rounded-t-lg ${!isBoardVisible ? 'rounded-b-lg' : ''}`}
              aria-expanded={isBoardVisible}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isBoardVisible ? (
                    <FaEye className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <FaEyeSlash className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-foreground">
                    {isBoardVisible ? t('hideBoard') : t('showBoard')}
                  </span>
                </div>
                <FaChevronDown
                  className={`w-5 h-5 text-muted-foreground transform transition-transform duration-200 ${
                    isBoardVisible ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Board Content */}
            <div
              className={`transition-all duration-300 ${isBoardVisible ? 'block' : 'hidden'} rounded-b-lg`}
            >
              <div className="p-4">
                <ChessBoard
                  fen={displayFen || currentFen}
                  flipped={playerColor === 'black'}
                  playerSide={playerColor}
                  lastMove={preferences.highlightLastMove ? currentLastMove : null}
                  showCoordinates={preferences.showCoordinates}
                  showOwnPieces={preferences.showOwnPieces}
                  showOpponentPieces={preferences.showOpponentPieces}
                  pieceShapeMode={preferences.pieceShapeMode}
                  pieceColors={preferences.pieceColors}
                  boardTheme={preferences.boardTheme}
                  className="max-w-2xl mx-auto"
                />

                {/* Navigation Controls (below board) */}
                {originalMoves.length > 0 && (
                  <div className="mt-4">
                    <MoveNavigationControls
                      onNavigateToStart={navigateToStart}
                      onNavigatePrevious={navigatePrevious}
                      onNavigateNext={navigateNext}
                      onNavigateToEnd={navigateToEnd}
                      isPreviousDisabled={
                        currentPosition === -2 ||
                        (currentPosition === -1 && originalMoves.length === 0)
                      }
                      isNextDisabled={currentPosition === -1}
                    />
                  </div>
                )}

                {/* Settings Link */}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    {t('configureBoardAppearance')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar, Input, Actions - White background like play screen */}
          <div className="mt-6 bg-card rounded-lg shadow-lg p-4">
            {/* Progress Bar */}
            <div className="mb-6">
              <ProgressBar current={progress} total={totalMoves} />
            </div>

            {!isCompleted ? (
              <>
                {/* Loading indicator during "Analyze All" */}
                {isAnalyzingAll ? (
                  <div className="py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      <span className="text-sm">{t('analyzing')}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Loading indicator during single move evaluation */}
                    {isEvaluating && (
                      <div className="mb-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <FaSpinner className="w-4 h-4 animate-spin" />
                          <span className="text-sm">{t('analyzing')}</span>
                        </div>
                      </div>
                    )}

                    {/* Move Input */}
                    <div className="mb-4">
                      <div>
                        {preferences.moveInputMode === 'select' ? (
                          <MoveSelect
                            fen={displayFen || currentFen}
                            onSubmit={handleSubmitMove}
                            disabled={isEvaluating}
                            placeholder={t('selectMove')}
                          />
                        ) : (
                          <MoveInput
                            value={moveInput}
                            onChange={(value) => {
                              setMoveInput(value);
                            }}
                            onSubmit={handleSubmitMove}
                            disabled={isEvaluating}
                            placeholder={t('inputMove')}
                            showSuggestions={preferences.enableAutoComplete}
                            showSubmitButton={true}
                          />
                        )}
                      </div>
                    </div>

                    {/* Action Buttons and Settings */}
                    <div className="pb-2">
                      {/* I don't know and Analyze All buttons */}
                      <div className="flex gap-2 justify-center mb-4">
                        <Button
                          variant="secondary"
                          onClick={handleDontKnow}
                          icon={<FaQuestionCircle className="w-4 h-4" />}
                          disabled={isEvaluating}
                          className="px-4 py-2"
                        >
                          {t('dontKnow')}
                        </Button>
                        {dontKnowCount >= 2 && (
                          <button
                            onClick={handleAnalyzeAll}
                            disabled={isEvaluating}
                            className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 flex items-center gap-2"
                          >
                            <FaCheck className="w-4 h-4" />
                            {showEvaluation ? t('analyzeAll') : t('autoFillAll')}
                          </button>
                        )}
                      </div>

                      {/* Settings checkboxes */}
                      <div className="flex flex-col gap-2 mb-4">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoOpponent}
                            onChange={(e) => setAutoOpponent(e.target.checked)}
                            className="w-4 h-4 rounded border-border"
                          />
                          <span className="text-sm text-muted-foreground">
                            {t('autoOpponentMoves')}
                          </span>
                        </label>
                        <div className="inline-flex items-center gap-2">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showEvaluation}
                              onChange={(e) => setShowEvaluation(e.target.checked)}
                              className="w-4 h-4 rounded border-border"
                            />
                            <span className="text-sm text-muted-foreground">
                              {t('showEvaluation')}
                            </span>
                          </label>
                          <button
                            onClick={() => setShowEvalInfo(true)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            aria-label="Evaluation information"
                          >
                            <FaInfoCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Move Log */}
                      {moveLog.length > 0 && (
                        <div className="mt-4 p-3 bg-muted/30 rounded-md max-h-48 overflow-y-auto">
                          <div className="font-mono text-sm">
                            {[...moveLog].reverse().map((entry, index) => {
                              const moveNotation = entry.isWhiteMove
                                ? `${entry.moveNumber}. ${entry.move}`
                                : `${entry.moveNumber}... ${entry.move}`;

                              if (entry.status === 'correct') {
                                return (
                                  <div key={moveLog.length - 1 - index} className="mb-2">
                                    <div className="text-green-600 dark:text-green-400">
                                      {moveNotation} <FaCheck className="inline w-3 h-3" />
                                    </div>
                                    {entry.evaluation && (
                                      <div className="text-muted-foreground text-xs ml-4 mt-1">
                                        <div className="flex items-center gap-1">
                                          {getEvaluationIcon(
                                            entry.evaluation.loss,
                                            entry.evaluation.mate !== undefined
                                          )}
                                          <span>
                                            {entry.evaluation.text} (
                                            {entry.evaluation.mate
                                              ? `#${entry.evaluation.mate}`
                                              : (entry.evaluation.score / 100).toFixed(2)}
                                            )
                                          </span>
                                        </div>
                                        {entry.evaluation.bestMove && (
                                          <div className="ml-5 mt-0.5 text-muted-foreground/80">
                                            {t('bestMove')}: {entry.evaluation.bestMove}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else if (entry.status === 'incorrect') {
                                return (
                                  <div
                                    key={moveLog.length - 1 - index}
                                    className="text-red-600 dark:text-red-400 mb-2"
                                  >
                                    {entry.incorrectMove
                                      ? `${entry.isWhiteMove ? `${entry.moveNumber}. ` : `${entry.moveNumber}... `}${entry.incorrectMove} ${t('logIncorrect')}`
                                      : `${moveNotation} ${t('logIncorrect')}`}
                                  </div>
                                );
                              } else {
                                // auto
                                return (
                                  <div key={moveLog.length - 1 - index} className="mb-2">
                                    <div className="text-muted-foreground">{moveNotation}</div>
                                    {entry.evaluation && (
                                      <div className="text-muted-foreground text-xs ml-4 mt-1">
                                        <div className="flex items-center gap-1">
                                          {getEvaluationIcon(
                                            entry.evaluation.loss,
                                            entry.evaluation.mate !== undefined
                                          )}
                                          <span>
                                            {entry.evaluation.text} (
                                            {entry.evaluation.mate
                                              ? `#${entry.evaluation.mate}`
                                              : (entry.evaluation.score / 100).toFixed(2)}
                                            )
                                          </span>
                                        </div>
                                        {entry.evaluation.bestMove && (
                                          <div className="ml-5 mt-0.5 text-muted-foreground/80">
                                            {t('bestMove')}: {entry.evaluation.bestMove}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              /* Completion Message */
              <div className="pb-2">
                <div className="py-8 text-center">
                  <FaCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">{t('completed')}</h3>
                  <p className="text-muted-foreground">
                    {selectedMoveIndex !== null ? (
                      <button
                        onClick={() => setSelectedMoveIndex(null)}
                        className="text-sm underline hover:text-foreground"
                      >
                        {t('backToCurrentPosition')}
                      </button>
                    ) : (
                      t('completedMessage')
                    )}
                  </p>
                </div>

                {/* Move Log - also show when completed */}
                {moveLog.length > 0 && (
                  <div className="mt-4 bg-muted/30 rounded-md">
                    {/* Filter header - only show when completed */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('moveLog')}
                      </span>
                      <button
                        onClick={() => setShowFilterModal(true)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
                        aria-label={t('filterMoves')}
                      >
                        <FaFilter className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-3 max-h-48 overflow-y-auto">
                      <div className="font-mono text-sm">
                        {[...getFilteredMoveLog()].reverse().map((entry) => {
                          const moveNotation = entry.isWhiteMove
                            ? `${entry.moveNumber}. ${entry.move}`
                            : `${entry.moveNumber}... ${entry.move}`;
                          const keyId = `${entry.moveNumber}-${entry.isWhiteMove ? 'w' : 'b'}-${entry.status}`;

                          if (entry.status === 'correct') {
                            return (
                              <div
                                key={keyId}
                                className="mb-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1"
                                onClick={() => handleMoveClick(entry)}
                              >
                                <div className="text-green-600 dark:text-green-400">
                                  {moveNotation} <FaCheck className="inline w-3 h-3" />
                                </div>
                                {entry.evaluation && (
                                  <div className="text-muted-foreground text-xs ml-4 mt-1">
                                    <div className="flex items-center gap-1">
                                      {getEvaluationIcon(
                                        entry.evaluation.loss,
                                        entry.evaluation.mate !== undefined
                                      )}
                                      <span>
                                        {entry.evaluation.text} (
                                        {entry.evaluation.mate
                                          ? `#${entry.evaluation.mate}`
                                          : (entry.evaluation.score / 100).toFixed(2)}
                                        )
                                      </span>
                                    </div>
                                    {entry.evaluation.bestMove && (
                                      <div className="ml-5 mt-0.5 text-muted-foreground/80">
                                        {t('bestMove')}: {entry.evaluation.bestMove}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          } else if (entry.status === 'incorrect') {
                            return (
                              <div
                                key={keyId}
                                className="text-red-600 dark:text-red-400 mb-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1"
                                onClick={() => handleMoveClick(entry)}
                              >
                                {entry.incorrectMove
                                  ? `${entry.isWhiteMove ? `${entry.moveNumber}. ` : `${entry.moveNumber}... `}${entry.incorrectMove} ${t('logIncorrect')}`
                                  : `${moveNotation} ${t('logIncorrect')}`}
                              </div>
                            );
                          } else {
                            // auto
                            return (
                              <div
                                key={keyId}
                                className="mb-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1"
                                onClick={() => handleMoveClick(entry)}
                              >
                                <div className="text-muted-foreground">{moveNotation}</div>
                                {entry.evaluation && (
                                  <div className="text-muted-foreground text-xs ml-4 mt-1">
                                    <div className="flex items-center gap-1">
                                      {getEvaluationIcon(
                                        entry.evaluation.loss,
                                        entry.evaluation.mate !== undefined
                                      )}
                                      <span>
                                        {entry.evaluation.text} (
                                        {entry.evaluation.mate
                                          ? `#${entry.evaluation.mate}`
                                          : (entry.evaluation.score / 100).toFixed(2)}
                                        )
                                      </span>
                                    </div>
                                    {entry.evaluation.bestMove && (
                                      <div className="ml-5 mt-0.5 text-muted-foreground/80">
                                        {t('bestMove')}: {entry.evaluation.bestMove}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Move List */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-lg">
            {/* Moves Header */}
            <div className="px-4 py-3 bg-muted/30 rounded-t-lg">
              <span className="text-foreground font-medium">{t('moves')}</span>
            </div>

            {/* Moves Content */}
            <div className="p-4 max-h-[70vh] overflow-y-auto font-mono">
              {formattedPgn.length > 0 ? (
                <>
                  <div className="space-y-0.5">
                    {formattedPgn.map((move, index) => {
                      const whiteIndex = index * 2;
                      const blackIndex = index * 2 + 1;
                      const isWhiteHighlighted = currentPosition === whiteIndex;
                      const isBlackHighlighted = currentPosition === blackIndex;

                      return (
                        <div key={move.moveNumber} className="flex items-center text-sm">
                          <span className="w-10 text-right pr-2 text-muted-foreground">
                            {move.moveNumber}.
                          </span>
                          <span
                            className={`flex-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              isWhiteHighlighted
                                ? 'bg-foreground/15 font-semibold dark:bg-foreground/10'
                                : 'hover:bg-muted/40'
                            }`}
                            onClick={() => navigateToPosition(whiteIndex)}
                          >
                            {move.whiteMove}
                          </span>
                          <span
                            className={`flex-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              isBlackHighlighted
                                ? 'bg-foreground/15 font-semibold dark:bg-foreground/10'
                                : move.blackMove
                                  ? 'hover:bg-muted/40'
                                  : ''
                            } ${!move.blackMove ? 'pointer-events-none' : ''}`}
                            onClick={() => move.blackMove && navigateToPosition(blackIndex)}
                          >
                            {move.blackMove || ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Navigation Controls */}
                  <div className="mt-4">
                    <MoveNavigationControls
                      onNavigateToStart={navigateToStart}
                      onNavigatePrevious={navigatePrevious}
                      onNavigateNext={navigateNext}
                      onNavigateToEnd={navigateToEnd}
                      isPreviousDisabled={
                        currentPosition === -2 ||
                        (currentPosition === -1 && originalMoves.length === 0)
                      }
                      isNextDisabled={currentPosition === -1}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-col gap-4">
                    {/* Analyze on Lichess Button - only show when navigating */}
                    {currentPosition !== -1 && currentPosition !== -2 && (
                      <Button
                        variant="secondary"
                        icon={<FaExternalLinkAlt className="w-3 h-3" />}
                        onClick={() => {
                          const fenToAnalyze = displayFen || currentFen;
                          const lichessUrl = fenToLichessUrl(fenToAnalyze);
                          window.open(lichessUrl, '_blank');
                        }}
                      >
                        {t('analyzeOnLichess')}
                      </Button>
                    )}

                    {/* Copy PGN Button */}
                    <Button
                      variant="secondary"
                      icon={
                        isCopied ? (
                          <FaCheck className="w-3 h-3 text-green-500" />
                        ) : (
                          <FaCopy className="w-3 h-3" />
                        )
                      }
                      onClick={() => {
                        const pgnText = formatPgnToText(formattedPgn);

                        navigator.clipboard.writeText(pgnText).then(() => {
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        });
                      }}
                    >
                      {isCopied ? t('copied') || 'Copied!' : t('copyPgn')}
                    </Button>

                    {/* Copy FEN Button */}
                    <Button
                      variant="secondary"
                      icon={
                        isFenCopied ? (
                          <FaCheck className="w-3 h-3 text-green-500" />
                        ) : (
                          <FaCopy className="w-3 h-3" />
                        )
                      }
                      onClick={() => {
                        // Use the same FEN that is sent to Lichess
                        const fenToCopy = displayFen || currentFen;

                        navigator.clipboard.writeText(fenToCopy).then(() => {
                          setIsFenCopied(true);
                          setTimeout(() => setIsFenCopied(false), 2000);
                        });
                      }}
                    >
                      {isFenCopied ? t('copied') || 'Copied!' : t('copyFen')}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No moves yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Info Modal */}
      <InfoModal
        isOpen={showEvalInfo}
        onClose={() => setShowEvalInfo(false)}
        title={t('evalInfoTitle')}
      >
        <div className="space-y-4">
          <div>
            <p className="mb-3">{t('evalInfoDescription')}</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>{t('evalInfoPoint1')}</li>
              <li>{t('evalInfoPoint2')}</li>
              <li>{t('evalInfoPoint3')}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">{t('evalScoreMeaning')}</h3>
            <p className="text-sm text-muted-foreground">{t('evalScoreDescription')}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">{t('evalCriteriaTitle')}</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 flex-shrink-0">
                  <FaStar className="w-2.5 h-2.5 text-white" />
                </span>
                <span>
                  <strong>{t('evalBest')}</strong>: {t('evalBestCriteria')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 flex-shrink-0">
                  <FaCheck className="w-2.5 h-2.5 text-white" />
                </span>
                <span>
                  <strong>{t('evalGood')}</strong>: {t('evalGoodCriteria')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-white text-[10px] font-bold flex-shrink-0">
                  ?!
                </span>
                <span>
                  <strong>{t('evalInaccuracy')}</strong>: {t('evalInaccuracyCriteria')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex-shrink-0">
                  ?
                </span>
                <span>
                  <strong>{t('evalMistake')}</strong>: {t('evalMistakeCriteria')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex-shrink-0">
                  ??
                </span>
                <span>
                  <strong>{t('evalBlunder')}</strong>: {t('evalBlunderCriteria')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </InfoModal>

      {/* Settings Modal */}
      <GameSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        playerSide={playerColor}
        translationNamespace="postmortem"
      />

      {/* Filter Modal */}
      <InfoModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title={t('filterMoves')}
      >
        <div className="space-y-6">
          {/* Player Filter */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">{t('filterPlayer')}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.player.own}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      player: { ...prev.player, own: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">{t('filterOwnMoves')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.player.opponent}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      player: { ...prev.player, opponent: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">{t('filterOpponentMoves')}</span>
              </label>
            </div>
          </div>

          {/* Evaluation Filter - only show if any move has evaluation */}
          {hasAnyEvaluation() && (
            <div>
              <h3 className="font-semibold mb-3 text-sm">{t('filterEvaluation')}</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.evaluation.best}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        evaluation: { ...prev.evaluation, best: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
                      <FaStar className="w-2 h-2 text-white" />
                    </span>
                    {t('evalBest')}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.evaluation.good}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        evaluation: { ...prev.evaluation, good: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
                      <FaCheck className="w-2 h-2 text-white" />
                    </span>
                    {t('evalGood')}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.evaluation.inaccuracy}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        evaluation: { ...prev.evaluation, inaccuracy: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-white text-[10px] font-bold">
                      ?!
                    </span>
                    {t('evalInaccuracy')}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.evaluation.mistake}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        evaluation: { ...prev.evaluation, mistake: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                      ?
                    </span>
                    {t('evalMistake')}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.evaluation.blunder}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        evaluation: { ...prev.evaluation, blunder: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      ??
                    </span>
                    {t('evalBlunder')}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={handleResetFilters} className="flex-1">
              {t('resetFilters')}
            </Button>
            <Button variant="primary" onClick={() => setShowFilterModal(false)} className="flex-1">
              {t('applyFilters')}
            </Button>
          </div>
        </div>
      </InfoModal>
    </div>
  );
}
