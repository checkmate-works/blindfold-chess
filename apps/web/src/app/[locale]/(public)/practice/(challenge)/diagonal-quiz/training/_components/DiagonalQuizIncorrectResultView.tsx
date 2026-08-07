'use client';

import { normalizeDiagonal } from '@blindfold-chess/features/diagonal-quiz';
import type { Square } from '@blindfold-chess/types';

import { DiagonalAnswerComparison } from '../../_components/DiagonalAnswerComparison';
import { DiagonalQuizResultLayout } from './DiagonalQuizResultLayout';

type Props = {
  question: Square;
  correctDiagonal: string;
  correctAntiDiagonal: string;
  userDiagonal: string;
  userAntiDiagonal: string;
  correctCount: number;
  incorrectCount: number;
  challengeHref: string;
  onNextAfterIncorrect: () => void;
  onEndTraining: () => void;
};

export function DiagonalQuizIncorrectResultView({
  question,
  correctDiagonal,
  correctAntiDiagonal,
  userDiagonal,
  userAntiDiagonal,
  correctCount,
  incorrectCount,
  challengeHref,
  onNextAfterIncorrect,
  onEndTraining,
}: Props) {
  const isDiagonalCorrect = normalizeDiagonal(userDiagonal) === normalizeDiagonal(correctDiagonal);
  const isAntiDiagonalCorrect =
    normalizeDiagonal(userAntiDiagonal) === normalizeDiagonal(correctAntiDiagonal);

  return (
    <DiagonalQuizResultLayout
      question={question}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      challengeHref={challengeHref}
      onNext={onNextAfterIncorrect}
      onEndTraining={onEndTraining}
    >
      <DiagonalAnswerComparison
        correctDiagonal={correctDiagonal}
        correctAntiDiagonal={correctAntiDiagonal}
        userDiagonal={userDiagonal}
        userAntiDiagonal={userAntiDiagonal}
        isDiagonalCorrect={isDiagonalCorrect}
        isAntiDiagonalCorrect={isAntiDiagonalCorrect}
      />
    </DiagonalQuizResultLayout>
  );
}
