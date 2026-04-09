import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChessGameManager } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveSequenceData, RecallResult } from '../_lib/types';

export function useMoveSequenceRecall(data: MoveSequenceData) {
  const [currentFen, setCurrentFen] = useState(data.fen);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [results, setResults] = useState<RecallResult[]>([]);
  const [completedMoves, setCompletedMoves] = useState<AlgebraicNotation[]>([]);

  const chessRef = useRef<ChessGameManager | null>(null);
  // Track attempts per move index using a Map (synchronous access)
  const attemptsMapRef = useRef<Map<number, number>>(new Map());
  // Track wrong attempts per move index using a Map
  const wrongAttemptsMapRef = useRef<Map<number, AlgebraicNotation[]>>(new Map());

  // Determine which moves the user needs to input
  const targetMoveIndices = useMemo(() => {
    if (data.includeOpponentMoves) {
      // All moves
      return data.moves.map((_, i) => i);
    } else {
      // Only player's moves
      return data.playerColor === 'w'
        ? data.moves.map((_, i) => i).filter((i) => i % 2 === 0)
        : data.moves.map((_, i) => i).filter((i) => i % 2 === 1);
    }
  }, [data.moves, data.playerColor, data.includeOpponentMoves]);

  // Current expected move
  const expectedMove = data.moves[currentMoveIndex] ?? null;

  // Check if current move requires user input
  const requiresUserInput = targetMoveIndices.includes(currentMoveIndex);

  // Total moves for progress (based on mode)
  const totalTargetMoves = targetMoveIndices.length;
  const completedTargetMoves = results.length;

  const isCompleted = currentMoveIndex >= data.moves.length;
  const isWhiteTurn = currentMoveIndex % 2 === 0;

  // Initialize chess instance
  useEffect(() => {
    chessRef.current = new ChessGameManager(data.fen);
  }, [data.fen]);

  // Auto-play opponent's move (only when includeOpponentMoves is false)
  const playOpponentMove = useCallback(() => {
    if (!chessRef.current || currentMoveIndex >= data.moves.length) return;

    const move = data.moves[currentMoveIndex];
    try {
      const result = chessRef.current.move(move);
      if (result) {
        setCurrentFen(chessRef.current.fen());
        setLastMove({ from: result.from, to: result.to });
        setCompletedMoves((prev) => [...prev, move]);
        setCurrentMoveIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error playing opponent move:', err);
    }
  }, [currentMoveIndex, data.moves]);

  // If it's not a move that requires user input, auto-play
  useEffect(() => {
    if (!requiresUserInput && currentMoveIndex < data.moves.length) {
      const timer = setTimeout(playOpponentMove, 500);
      return () => clearTimeout(timer);
    }
  }, [requiresUserInput, currentMoveIndex, data.moves.length, playOpponentMove]);

  // Formatted Move History string
  const formattedMoveHistory = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < completedMoves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = completedMoves[i];
      const blackMove = completedMoves[i + 1];

      if (blackMove) {
        parts.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
      } else {
        parts.push(`${moveNumber}. ${whiteMove}`);
      }
    }
    return parts.join(' ');
  }, [completedMoves]);

  const handleMoveSubmit = (
    move: string,
    onSuccess: () => void,
    onFailure: (message?: string) => void
  ) => {
    if (!chessRef.current || !expectedMove) return;

    setError(null);

    // Normalize moves for comparison
    const normalizedInput = move.trim();
    const normalizedExpected = expectedMove.trim();

    // Try to make the move
    try {
      const result = chessRef.current.move(normalizedInput);

      if (result) {
        // Check if it's the correct move
        const isCorrect = normalizedInput === normalizedExpected;

        if (isCorrect) {
          // Get current attempts for this move (synchronous read from ref)
          const attemptCount = attemptsMapRef.current.get(currentMoveIndex) ?? 1;
          // Correct move - only count as "correct" if first attempt
          const isFirstTryCorrect = attemptCount === 1;
          // Get wrong attempts for this specific move index
          const wrongAttemptsForThisMove = wrongAttemptsMapRef.current.get(currentMoveIndex) ?? [];
          setResults((prev) => [
            ...prev,
            {
              expectedMove: expectedMove,
              userMove: normalizedInput as AlgebraicNotation,
              isCorrect: isFirstTryCorrect,
              attempts: attemptCount,
              wrongAttempts: [...wrongAttemptsForThisMove],
            },
          ]);
          setCurrentFen(chessRef.current.fen());
          setLastMove({ from: result.from, to: result.to });
          setCompletedMoves((prev) => [...prev, normalizedInput as AlgebraicNotation]);
          // Clean up refs for this move
          attemptsMapRef.current.delete(currentMoveIndex);
          wrongAttemptsMapRef.current.delete(currentMoveIndex);
          setCurrentMoveIndex((prev) => prev + 1);
          onSuccess();
        } else {
          // Valid move but not the expected one
          // Undo the move
          chessRef.current.undo();
          onFailure('wrongMove'); // Special flag for translations in the component
          // Increment attempts in ref (synchronous)
          const currentCount = attemptsMapRef.current.get(currentMoveIndex) ?? 1;
          attemptsMapRef.current.set(currentMoveIndex, currentCount + 1);
          // Add wrong attempt to the Map for current move index
          const existing = wrongAttemptsMapRef.current.get(currentMoveIndex) ?? [];
          wrongAttemptsMapRef.current.set(currentMoveIndex, [
            ...existing,
            normalizedInput as AlgebraicNotation,
          ]);
        }
      } else {
        // Invalid move (not a legal chess move)
        onFailure('invalidMove');
        // Still count as a wrong attempt
        const currentCount = attemptsMapRef.current.get(currentMoveIndex) ?? 1;
        attemptsMapRef.current.set(currentMoveIndex, currentCount + 1);
        const existing = wrongAttemptsMapRef.current.get(currentMoveIndex) ?? [];
        wrongAttemptsMapRef.current.set(currentMoveIndex, [
          ...existing,
          normalizedInput as AlgebraicNotation,
        ]);
      }
    } catch {
      // Exception during move (also invalid)
      onFailure('invalidMove');
      // Still count as a wrong attempt
      const currentCount = attemptsMapRef.current.get(currentMoveIndex) ?? 1;
      attemptsMapRef.current.set(currentMoveIndex, currentCount + 1);
      const existing = wrongAttemptsMapRef.current.get(currentMoveIndex) ?? [];
      wrongAttemptsMapRef.current.set(currentMoveIndex, [
        ...existing,
        normalizedInput as AlgebraicNotation,
      ]);
    }
  };

  return {
    currentFen,
    currentMoveIndex,
    error,
    setError,
    lastMove,
    results,
    completedMoves,
    formattedMoveHistory,
    targetMoveIndices,
    totalTargetMoves,
    completedTargetMoves,
    requiresUserInput,
    isCompleted,
    isWhiteTurn,
    handleMoveSubmit,
  };
}
