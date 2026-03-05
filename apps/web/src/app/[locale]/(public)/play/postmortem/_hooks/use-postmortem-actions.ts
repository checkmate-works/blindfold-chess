import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveLogEntry } from '../_lib';
import { buildPreviousEval, computeMoveNumber, getPositionEvaluation } from '../_lib';

type Props = {
  originalMoves: AlgebraicNotation[];
  userMoves: AlgebraicNotation[];
  currentMoveIndex: number;
  moveLog: MoveLogEntry[];
  gamePositions: { fen: string; lastMove?: { from: string; to: string } }[];
  startsAsBlack: boolean;
  startMoveNumber: number;
  showEvaluation: boolean;
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
  gamePositions,
  startsAsBlack,
  startMoveNumber,
  showEvaluation,
  isPlayerTurn,
  autoOpponent,
  isCompleted,
  setUserMoves,
  setCurrentMoveIndex,
  setMoveLog,
  setIsCompleted,
}: Props) {
  const t = useTranslations('postmortem');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [dontKnowCount, setDontKnowCount] = useState(0);

  // Keep moveLog in a ref to avoid it triggering re-renders in dependency arrays
  const moveLogRef = useRef(moveLog);
  moveLogRef.current = moveLog;

  /**
   * Shared logic for processing a correct / auto-filled move:
   * state update + optional evaluation fetch + log entry + completion check.
   */
  const processCorrectMove = useCallback(
    async (
      move: AlgebraicNotation,
      index: number,
      status: 'correct' | 'auto',
      previousEval: { score: number; mate?: number; bestMove?: string } | undefined
    ) => {
      const { moveNumber, isWhiteMove } = computeMoveNumber(index, startsAsBlack, startMoveNumber);
      const newIndex = index + 1;

      setUserMoves((prev) => [...prev, move]);
      setCurrentMoveIndex(newIndex);

      const evaluation = showEvaluation
        ? await getPositionEvaluation(
            gamePositions[index].fen,
            gamePositions[index + 1].fen,
            index,
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
          status,
          evaluation,
        },
      ]);

      if (newIndex >= originalMoves.length) {
        setIsCompleted(true);
      }
    },
    [
      startsAsBlack,
      startMoveNumber,
      showEvaluation,
      t,
      gamePositions,
      originalMoves.length,
      setUserMoves,
      setCurrentMoveIndex,
      setMoveLog,
      setIsCompleted,
    ]
  );

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
        const previousEval = buildPreviousEval(moveLogRef.current);
        await processCorrectMove(opponentMove, currentMoveIndex, 'auto', previousEval);
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
    processCorrectMove,
  ]);

  // Handle move submission
  const handleSubmitMove = useCallback(
    async (
      move: AlgebraicNotation,
      setMoveInputValue: React.Dispatch<React.SetStateAction<string>>
    ) => {
      if (isEvaluating) return;

      const expectedMove = originalMoves[currentMoveIndex];

      if (move === expectedMove) {
        setIsEvaluating(true);
        setMoveInputValue('');
        const previousEval = buildPreviousEval(moveLogRef.current);
        await processCorrectMove(move, currentMoveIndex, 'correct', previousEval);
        setIsEvaluating(false);
      } else {
        const { moveNumber, isWhiteMove } = computeMoveNumber(
          currentMoveIndex,
          startsAsBlack,
          startMoveNumber
        );
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
      isEvaluating,
      startsAsBlack,
      startMoveNumber,
      processCorrectMove,
      setMoveLog,
    ]
  );

  // Handle "I don't know" button
  const handleDontKnow = useCallback(
    async (setMoveInputValue: React.Dispatch<React.SetStateAction<string>>) => {
      if (isEvaluating) return;

      setIsEvaluating(true);
      setDontKnowCount((prev) => prev + 1);
      setMoveInputValue('');

      const correctMove = originalMoves[currentMoveIndex];
      await processCorrectMove(correctMove, currentMoveIndex, 'auto', undefined);
      setIsEvaluating(false);
    },
    [currentMoveIndex, originalMoves, isEvaluating, processCorrectMove]
  );

  // Handle "Analyze All" button
  const handleAnalyzeAll = useCallback(async () => {
    if (isEvaluating) return;

    setIsEvaluating(true);
    setIsAnalyzingAll(true);

    const remainingMoves = originalMoves.slice(currentMoveIndex);
    const newMoves = [...userMoves, ...remainingMoves];
    setUserMoves(newMoves);

    const newLogEntries: MoveLogEntry[] = [];
    let previousEval = buildPreviousEval(moveLogRef.current);

    for (let i = currentMoveIndex; i < originalMoves.length; i++) {
      const move = originalMoves[i];
      const { moveNumber, isWhiteMove } = computeMoveNumber(i, startsAsBlack, startMoveNumber);

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
    showEvaluation,
    isEvaluating,
    t,
    gamePositions,
    startsAsBlack,
    startMoveNumber,
    setUserMoves,
    setCurrentMoveIndex,
    setMoveLog,
    setIsCompleted,
  ]);

  return {
    isEvaluating,
    isAnalyzingAll,
    dontKnowCount,
    handleSubmitMove,
    handleDontKnow,
    handleAnalyzeAll,
  };
}
