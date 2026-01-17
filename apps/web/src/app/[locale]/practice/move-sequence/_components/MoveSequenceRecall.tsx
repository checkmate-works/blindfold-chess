'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ChessBoard } from '@/app/_components';
import { Chess } from 'chess.js';
import { FaChevronDown, FaEye, FaEyeSlash } from 'react-icons/fa';

import type { AlgebraicNotation } from '@/lib/types';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { MoveInput } from '@/app/[locale]/play/_components/MoveInput';
import { MoveSelect } from '@/app/[locale]/play/_components/MoveSelect';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';

import type { MoveSequenceData, MoveSequenceSessionResult, RecallResult } from '../_lib/types';

type Props = {
  data: MoveSequenceData;
  onComplete: (result: MoveSequenceSessionResult) => void;
  onQuit: (result: MoveSequenceSessionResult) => void;
};

export function MoveSequenceRecall({ data, onComplete, onQuit }: Props) {
  const t = useTranslations('practice.moveSequence');
  const { preferences } = useGamePreferences();

  const [currentFen, setCurrentFen] = useState(data.fen);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [moveInput, setMoveInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [results, setResults] = useState<RecallResult[]>([]);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [completedMoves, setCompletedMoves] = useState<AlgebraicNotation[]>([]);

  const chessRef = useRef<Chess | null>(null);
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

  // Initialize chess instance
  useEffect(() => {
    chessRef.current = new Chess(data.fen);
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

  // Check if all moves are complete
  useEffect(() => {
    if (currentMoveIndex >= data.moves.length) {
      // Calculate final results
      const correctMoves = results.filter((r) => r.isCorrect).length;
      onComplete({
        totalMoves: totalTargetMoves,
        correctMoves,
        accuracy: totalTargetMoves > 0 ? Math.round((correctMoves / totalTargetMoves) * 100) : 0,
        results,
      });
    }
  }, [currentMoveIndex, data.moves.length, results, totalTargetMoves, onComplete]);

  // Handle move submission
  const handleSubmit = (move: AlgebraicNotation) => {
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
          setMoveInput('');
        } else {
          // Valid move but not the expected one
          // Undo the move
          chessRef.current.undo();
          setError(t('wrongMove', { move: normalizedInput }));
          // Increment attempts in ref (synchronous)
          const currentCount = attemptsMapRef.current.get(currentMoveIndex) ?? 1;
          attemptsMapRef.current.set(currentMoveIndex, currentCount + 1);
          // Add wrong attempt to the Map for current move index
          const existing = wrongAttemptsMapRef.current.get(currentMoveIndex) ?? [];
          wrongAttemptsMapRef.current.set(currentMoveIndex, [
            ...existing,
            normalizedInput as AlgebraicNotation,
          ]);
          setMoveInput('');
        }
      } else {
        // Invalid move (not a legal chess move)
        setError(t('invalidMove'));
        // Still count as a wrong attempt
        const currentCount = attemptsMapRef.current.get(currentMoveIndex) ?? 1;
        attemptsMapRef.current.set(currentMoveIndex, currentCount + 1);
        const existing = wrongAttemptsMapRef.current.get(currentMoveIndex) ?? [];
        wrongAttemptsMapRef.current.set(currentMoveIndex, [
          ...existing,
          normalizedInput as AlgebraicNotation,
        ]);
        setMoveInput('');
      }
    } catch {
      // Exception during move (also invalid)
      setError(t('invalidMove'));
      // Still count as a wrong attempt
      const currentCount = attemptsMapRef.current.get(currentMoveIndex) ?? 1;
      attemptsMapRef.current.set(currentMoveIndex, currentCount + 1);
      const existing = wrongAttemptsMapRef.current.get(currentMoveIndex) ?? [];
      wrongAttemptsMapRef.current.set(currentMoveIndex, [
        ...existing,
        normalizedInput as AlgebraicNotation,
      ]);
      setMoveInput('');
    }
  };

  const handleInputChange = (value: string) => {
    setMoveInput(value);
    if (error) setError(null);
  };

  const flipped = data.playerColor === 'b';

  // Format completed moves as PGN notation
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

  // Determine whose turn it is for the prompt
  const isWhiteTurn = currentMoveIndex % 2 === 0;
  const turnLabel = data.includeOpponentMoves
    ? isWhiteTurn
      ? t('whiteTurn')
      : t('blackTurn')
    : t('yourMove');

  // If all moves are complete, show loading while transitioning
  if (currentMoveIndex >= data.moves.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-card rounded-md shadow-sm border border-border p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar current={completedTargetMoves} total={totalTargetMoves} />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {completedTargetMoves} / {totalTargetMoves}
          </span>
        </div>
      </div>

      {/* Move History */}
      {completedMoves.length > 0 && (
        <div className="bg-card rounded-md shadow-sm border border-border p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('moveHistory')}</h3>
          <p className="font-mono text-sm text-foreground break-words">{formattedMoveHistory}</p>
        </div>
      )}

      {/* Board Toggle */}
      <div className="bg-card rounded-md shadow-sm border border-border">
        <button
          onClick={() => setIsBoardVisible(!isBoardVisible)}
          className={`w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border/50 focus:ring-inset rounded-t-xl ${!isBoardVisible ? 'rounded-b-xl' : ''}`}
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
          className={`transition-all duration-300 ${isBoardVisible ? 'block' : 'hidden'} rounded-b-xl`}
        >
          <div className="flex justify-center py-4">
            <div className="w-full max-w-md">
              <ChessBoard
                fen={currentFen}
                flipped={flipped}
                showCoordinates={preferences.showCoordinates}
                boardTheme={preferences.boardTheme}
                lastMove={preferences.highlightLastMove ? lastMove : null}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Move Input */}
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        {requiresUserInput ? (
          <>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{turnLabel}</h3>
            {preferences.moveInputMode === 'select' ? (
              <MoveSelect fen={currentFen} onSubmit={handleSubmit} disabled={false} />
            ) : (
              <MoveInput
                value={moveInput}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                disabled={false}
                showSuggestions={preferences.enableAutoComplete}
                showSubmitButton={true}
              />
            )}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </>
        ) : (
          <p className="text-center text-muted-foreground">{t('opponentTurn')}</p>
        )}
      </div>

      {/* End Practice Link */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            // Calculate results for completed moves so far
            const correctMoves = results.filter((r) => r.isCorrect).length;
            onQuit({
              totalMoves: totalTargetMoves,
              correctMoves,
              accuracy:
                totalTargetMoves > 0 ? Math.round((correctMoves / totalTargetMoves) * 100) : 0,
              results,
            });
          }}
          className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
        >
          {t('endPractice')}
        </button>
      </div>
    </div>
  );
}
