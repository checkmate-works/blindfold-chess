'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ChessBoard } from '@/app/_components';
import { Chess } from 'chess.js';
import { FaChevronDown, FaEye, FaEyeSlash } from 'react-icons/fa';

import type { AlgebraicNotation } from '@/lib/types';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { MoveInput } from '@/app/[locale]/play/_components/MoveInput';
import { MoveSelect } from '@/app/[locale]/play/_components/MoveSelect';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';

import { getPlayerMoves } from '../_lib/pgn-parser';
import type { MoveSequenceData, MoveSequenceSessionResult, RecallResult } from '../_lib/types';

type Props = {
  data: MoveSequenceData;
  onComplete: (result: MoveSequenceSessionResult) => void;
};

export function MoveSequenceRecall({ data, onComplete }: Props) {
  const t = useTranslations('practice.moveSequence');
  const { preferences } = useGamePreferences();

  const [currentFen, setCurrentFen] = useState(data.fen);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [moveInput, setMoveInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [results, setResults] = useState<RecallResult[]>([]);
  const [currentAttempts, setCurrentAttempts] = useState(1);
  const [isBoardVisible, setIsBoardVisible] = useState(false);

  const chessRef = useRef<Chess | null>(null);

  // Get player's moves only
  const playerMoves = getPlayerMoves(data.moves, data.playerColor);
  const playerMoveIndices =
    data.playerColor === 'w'
      ? data.moves.map((_, i) => i).filter((i) => i % 2 === 0)
      : data.moves.map((_, i) => i).filter((i) => i % 2 === 1);

  // Current expected move in player's sequence
  const currentPlayerMoveIndex = playerMoveIndices.findIndex((i) => i >= currentMoveIndex);
  const expectedMove = currentPlayerMoveIndex >= 0 ? playerMoves[currentPlayerMoveIndex] : null;
  const isPlayerTurn = playerMoveIndices.includes(currentMoveIndex);

  // Total player moves for progress
  const totalPlayerMoves = playerMoves.length;
  const completedPlayerMoves = results.length;

  // Initialize chess instance
  useEffect(() => {
    chessRef.current = new Chess(data.fen);

    // Apply moves up to the starting point if needed
    // (in case we start from a position where it's not the first move)
  }, [data.fen]);

  // Auto-play opponent's move
  const playOpponentMove = useCallback(() => {
    if (!chessRef.current || currentMoveIndex >= data.moves.length) return;

    const move = data.moves[currentMoveIndex];
    try {
      const result = chessRef.current.move(move);
      if (result) {
        setCurrentFen(chessRef.current.fen());
        setLastMove({ from: result.from, to: result.to });
        setCurrentMoveIndex((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error playing opponent move:', error);
    }
  }, [currentMoveIndex, data.moves]);

  // If it's opponent's turn, auto-play their move
  useEffect(() => {
    if (!isPlayerTurn && currentMoveIndex < data.moves.length) {
      const timer = setTimeout(playOpponentMove, 500);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, currentMoveIndex, data.moves.length, playOpponentMove]);

  // Check if all moves are complete
  useEffect(() => {
    if (currentMoveIndex >= data.moves.length) {
      // Calculate final results
      const correctMoves = results.filter((r) => r.isCorrect).length;
      onComplete({
        totalMoves: totalPlayerMoves,
        correctMoves,
        accuracy: totalPlayerMoves > 0 ? Math.round((correctMoves / totalPlayerMoves) * 100) : 0,
        results,
      });
    }
  }, [currentMoveIndex, data.moves.length, results, totalPlayerMoves, onComplete]);

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
          // Correct move
          setResults((prev) => [
            ...prev,
            {
              expectedMove: expectedMove,
              userMove: normalizedInput as AlgebraicNotation,
              isCorrect: true,
              attempts: currentAttempts,
            },
          ]);
          setCurrentFen(chessRef.current.fen());
          setLastMove({ from: result.from, to: result.to });
          setCurrentMoveIndex((prev) => prev + 1);
          setMoveInput('');
          setCurrentAttempts(1);
        } else {
          // Valid move but not the expected one
          // Undo the move
          chessRef.current.undo();
          setError(t('wrongMove', { move: normalizedInput }));
          setCurrentAttempts((prev) => prev + 1);
          setMoveInput('');
        }
      } else {
        setError(t('invalidMove'));
        setMoveInput('');
      }
    } catch {
      setError(t('invalidMove'));
      setMoveInput('');
    }
  };

  const handleInputChange = (value: string) => {
    setMoveInput(value);
    if (error) setError(null);
  };

  const flipped = data.playerColor === 'b';

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
      <div className="bg-card rounded-xl shadow-sm border border-border p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar current={completedPlayerMoves} total={totalPlayerMoves} />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {completedPlayerMoves} / {totalPlayerMoves}
          </span>
        </div>
      </div>

      {/* Board Toggle */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
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
          <div className="p-4">
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

      {/* Move Input */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        {isPlayerTurn ? (
          <>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('yourMove')}</h3>
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
    </div>
  );
}
