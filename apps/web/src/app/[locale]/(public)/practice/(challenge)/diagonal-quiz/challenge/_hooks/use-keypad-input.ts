'use client';

import { useCallback, useEffect, useRef } from 'react';

import { getCornerInfo } from '@blindfold-chess/features/diagonal-quiz';
import type { ActiveField } from '@blindfold-chess/features/diagonal-quiz';
import { useDiagonalInput } from '@blindfold-chess/features/diagonal-quiz/client';

type UseKeypadInputOptions = {
  currentSquare: string;
  showResult: boolean;
  isDisabled: boolean;
  onAnswer: (diagonal: string, antiDiagonal: string) => void;
};

export function useKeypadInput({
  currentSquare,
  showResult,
  isDisabled,
  onAnswer,
}: UseKeypadInputOptions) {
  const { singleDiagonal, singleAntiDiagonal } = getCornerInfo(currentSquare);

  const onBothComplete = useCallback(
    (diagonal: string, antiDiagonal: string) => {
      if (isDisabled) return;
      onAnswer(diagonal, antiDiagonal);
    },
    [isDisabled, onAnswer]
  );

  const {
    diagonalStartText,
    diagonalEndText,
    antiDiagonalStartText,
    antiDiagonalEndText,
    activeField,
    setActiveField,
    isDiagonalComplete,
    isAntiDiagonalComplete,
    expectingFile,
    expectingRank,
    isInputtingStart,
    isInputtingEnd,
    handleFilePress,
    handleRankPress,
    handleBackspace,
    handleClear,
    reset,
  } = useDiagonalInput({
    onBothComplete,
    disabled: isDisabled,
    allowSingleSquareDiagonal: singleDiagonal,
    allowSingleSquareAntiDiagonal: singleAntiDiagonal,
  });

  // Reset input when the question changes
  const prevSquareRef = useRef(currentSquare);
  useEffect(() => {
    if (prevSquareRef.current !== currentSquare) {
      prevSquareRef.current = currentSquare;
      reset();
    }
  }, [currentSquare, reset]);

  // Also reset when showResult transitions from true to false (new question)
  const prevShowResultRef = useRef(showResult);
  useEffect(() => {
    if (prevShowResultRef.current && !showResult) {
      reset();
    }
    prevShowResultRef.current = showResult;
  }, [showResult, reset]);

  const handleFieldClick = useCallback(
    (field: ActiveField) => {
      if (isDisabled) return;
      setActiveField(field);
    },
    [isDisabled, setActiveField]
  );

  return {
    singleDiagonal,
    singleAntiDiagonal,
    diagonalStartText,
    diagonalEndText,
    antiDiagonalStartText,
    antiDiagonalEndText,
    activeField,
    isDiagonalComplete,
    isAntiDiagonalComplete,
    expectingFile,
    expectingRank,
    isInputtingStart,
    isInputtingEnd,
    handleFilePress,
    handleRankPress,
    handleBackspace,
    handleClear,
    handleFieldClick,
  };
}
