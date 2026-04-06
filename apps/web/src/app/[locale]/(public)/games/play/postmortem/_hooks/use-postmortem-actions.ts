import { useCallback, useEffect, useRef, useState } from 'react';

import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveLogEntry } from '../_lib';
import { computeMoveNumber } from '../_lib';

type Props = {
  originalMoves: AlgebraicNotation[];
  userMoves: AlgebraicNotation[];
  currentMoveIndex: number;
  moveLog: MoveLogEntry[];
  startsAsBlack: boolean;
  startMoveNumber: number;
  isPlayerTurn: boolean;
  autoOpponent: boolean;
  isCompleted: boolean;
  setUserMoves: React.Dispatch<React.SetStateAction<AlgebraicNotation[]>>;
  setCurrentMoveIndex: React.Dispatch<React.SetStateAction<number>>;
  setMoveLog: React.Dispatch<React.SetStateAction<MoveLogEntry[]>>;
  setIsCompleted: React.Dispatch<React.SetStateAction<boolean>>;
};

export function usePostmortemActions({
  originalMoves,
  userMoves,
  currentMoveIndex,
  moveLog,
  startsAsBlack,
  startMoveNumber,
  isPlayerTurn,
  autoOpponent,
  isCompleted,
  setUserMoves,
  setCurrentMoveIndex,
  setMoveLog,
  setIsCompleted,
}: Props) {
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [dontKnowCount, setDontKnowCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<{
    type: 'correct' | 'incorrect';
    moveNumber: number;
    isWhiteMove: boolean;
    move: string;
  } | null>(null);

  // Keep moveLog in a ref to avoid it triggering re-renders in dependency arrays
  const moveLogRef = useRef(moveLog);
  moveLogRef.current = moveLog;

  /**
   * Shared logic for processing a correct / auto-filled move:
   * state update + log entry + completion check.
   */
  const processCorrectMove = useCallback(
    (move: AlgebraicNotation, index: number, status: 'correct' | 'auto') => {
      const { moveNumber, isWhiteMove } = computeMoveNumber(index, startsAsBlack, startMoveNumber);
      const newIndex = index + 1;

      setUserMoves((prev) => [...prev, move]);
      setCurrentMoveIndex(newIndex);

      setMoveLog((prev) => [
        ...prev,
        {
          moveNumber,
          isWhiteMove,
          move,
          status,
        },
      ]);

      if (newIndex >= originalMoves.length) {
        setIsCompleted(true);
      }
    },
    [
      startsAsBlack,
      startMoveNumber,
      originalMoves.length,
      setUserMoves,
      setCurrentMoveIndex,
      setMoveLog,
      setIsCompleted,
    ]
  );

  // Auto-fill opponent's move if needed
  useEffect(() => {
    if (autoOpponent && !isPlayerTurn && currentMoveIndex < originalMoves.length && !isCompleted) {
      const opponentMove = originalMoves[currentMoveIndex];
      processCorrectMove(opponentMove, currentMoveIndex, 'auto');
    }
  }, [
    autoOpponent,
    isPlayerTurn,
    currentMoveIndex,
    originalMoves,
    isCompleted,
    processCorrectMove,
  ]);

  // Handle move submission
  const handleSubmitMove = useCallback(
    (move: AlgebraicNotation, setMoveInputValue: React.Dispatch<React.SetStateAction<string>>) => {
      const expectedMove = originalMoves[currentMoveIndex];

      if (move === expectedMove) {
        const { moveNumber, isWhiteMove } = computeMoveNumber(
          currentMoveIndex,
          startsAsBlack,
          startMoveNumber
        );
        setMoveInputValue('');
        setLastFeedback({ type: 'correct', moveNumber, isWhiteMove, move });
        processCorrectMove(move, currentMoveIndex, 'correct');
      } else {
        const { moveNumber, isWhiteMove } = computeMoveNumber(
          currentMoveIndex,
          startsAsBlack,
          startMoveNumber
        );
        setLastFeedback({ type: 'incorrect', moveNumber, isWhiteMove, move });
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
      startsAsBlack,
      startMoveNumber,
      processCorrectMove,
      setMoveLog,
    ]
  );

  // Handle "I don't know" button
  const handleDontKnow = useCallback(
    (setMoveInputValue: React.Dispatch<React.SetStateAction<string>>) => {
      setDontKnowCount((prev) => prev + 1);
      setMoveInputValue('');

      const correctMove = originalMoves[currentMoveIndex];
      processCorrectMove(correctMove, currentMoveIndex, 'auto');
    },
    [currentMoveIndex, originalMoves, processCorrectMove]
  );

  // Handle "Auto Fill All" button
  const handleAnalyzeAll = useCallback(() => {
    setIsAnalyzingAll(true);

    const remainingMoves = originalMoves.slice(currentMoveIndex);
    const newMoves = [...userMoves, ...remainingMoves];
    setUserMoves(newMoves);

    const newLogEntries: MoveLogEntry[] = [];

    for (let i = currentMoveIndex; i < originalMoves.length; i++) {
      const move = originalMoves[i];
      const { moveNumber, isWhiteMove } = computeMoveNumber(i, startsAsBlack, startMoveNumber);

      newLogEntries.push({
        moveNumber,
        isWhiteMove,
        move,
        status: 'auto',
      });
    }

    setMoveLog((prev) => [...prev, ...newLogEntries]);
    setCurrentMoveIndex(originalMoves.length);
    setIsCompleted(true);
    setIsAnalyzingAll(false);
  }, [
    currentMoveIndex,
    originalMoves,
    userMoves,
    startsAsBlack,
    startMoveNumber,
    setUserMoves,
    setCurrentMoveIndex,
    setMoveLog,
    setIsCompleted,
  ]);

  const clearFeedback = useCallback(() => setLastFeedback(null), []);

  return {
    isAnalyzingAll,
    dontKnowCount,
    lastFeedback,
    clearFeedback,
    handleSubmitMove,
    handleDontKnow,
    handleAnalyzeAll,
  };
}
