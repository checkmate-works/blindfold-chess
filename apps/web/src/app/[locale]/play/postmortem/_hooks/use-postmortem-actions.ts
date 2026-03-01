import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveLogEntry } from '../_lib';
import { getPositionEvaluation } from '../_lib';

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

        const currentLog = moveLogRef.current;
        const previousEval =
          currentLog.length > 0 && currentLog[currentLog.length - 1].evaluation
            ? {
                score: currentLog[currentLog.length - 1].evaluation!.score,
                mate: currentLog[currentLog.length - 1].evaluation!.mate,
                bestMove: currentLog[currentLog.length - 1].evaluation!.nextBestMove,
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
    gamePositions,
    startsAsBlack,
    startMoveNumber,
    setUserMoves,
    setCurrentMoveIndex,
    setMoveLog,
    setIsCompleted,
  ]);

  // Handle move submission
  const handleSubmitMove = useCallback(
    async (
      move: AlgebraicNotation,
      setMoveInputValue: React.Dispatch<React.SetStateAction<string>>
    ) => {
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

        const currentLog = moveLogRef.current;
        const previousEval =
          currentLog.length > 0 && currentLog[currentLog.length - 1].evaluation
            ? {
                score: currentLog[currentLog.length - 1].evaluation!.score,
                mate: currentLog[currentLog.length - 1].evaluation!.mate,
                bestMove: currentLog[currentLog.length - 1].evaluation!.nextBestMove,
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
      gamePositions,
      startsAsBlack,
      startMoveNumber,
      setUserMoves,
      setCurrentMoveIndex,
      setMoveLog,
      setIsCompleted,
    ]
  );

  // Handle "I don't know" button
  const handleDontKnow = useCallback(
    async (setMoveInputValue: React.Dispatch<React.SetStateAction<string>>) => {
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
    },
    [
      currentMoveIndex,
      originalMoves,
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
    ]
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
    const currentLog = moveLogRef.current;
    let previousEval =
      currentLog.length > 0 && currentLog[currentLog.length - 1].evaluation
        ? {
            score: currentLog[currentLog.length - 1].evaluation!.score,
            mate: currentLog[currentLog.length - 1].evaluation!.mate,
            bestMove: currentLog[currentLog.length - 1].evaluation!.nextBestMove,
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
