'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Square } from '@blindfold-chess/types';

import { TrainingFooter } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingFooter';
import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalAnswerPanel } from '../../_components/DiagonalAnswerPanel';
import { useKeypadInput } from '../../_hooks/use-keypad-input';
import { DiagonalQuizIncorrectResultView } from './DiagonalQuizIncorrectResultView';
import { DiagonalQuizSkipResultView } from './DiagonalQuizSkipResultView';

type Props = {
  locale: Locale;
  currentSquare: Square;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    question: Square;
    correctDiagonal: string;
    correctAntiDiagonal: string;
    skipped: boolean;
    userDiagonal?: string;
    userAntiDiagonal?: string;
  } | null;
  onAnswer: (diagonal: string, antiDiagonal: string) => void;
  onSkip: () => void;
  onNextAfterSkip: () => void;
  onNextAfterIncorrect: () => void;
  correctCount: number;
  incorrectCount: number;
  onEndTraining: () => void;
};

export function DiagonalQuizTrainingPlaying({
  locale,
  currentSquare,
  showResult,
  lastAnswer,
  onAnswer,
  onSkip,
  onNextAfterSkip,
  onNextAfterIncorrect,
  correctCount,
  incorrectCount,
  onEndTraining,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const tp = useTranslations('practice');
  const isDisabled = showResult;
  const challengeHref = `/${locale}/practice/diagonal-quiz/challenge`;

  // Incorrect/skip route to their own result views below, so the inline view
  // only ever grades a correct answer. Tint the always-present answer fields
  // green instead of flashing a "Correct" label, which would shift the layout.
  const fieldResult =
    showResult && lastAnswer ? (lastAnswer.correct ? 'correct' : 'incorrect') : null;

  const input = useKeypadInput({ currentSquare, showResult, isDisabled, onAnswer });

  useAlgebraicKeyboardInput({
    onFile: input.handleFilePress,
    onRank: input.handleRankPress,
    onBackspace: input.handleBackspace,
    enabled: !isDisabled,
  });

  const isSkipResult = showResult && lastAnswer?.skipped;
  const isIncorrectResult = showResult && lastAnswer && !lastAnswer.correct && !lastAnswer.skipped;

  if (isSkipResult && lastAnswer) {
    return (
      <div className="max-w-md mx-auto">
        <DiagonalQuizSkipResultView
          question={lastAnswer.question}
          correctDiagonal={lastAnswer.correctDiagonal}
          correctAntiDiagonal={lastAnswer.correctAntiDiagonal}
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          challengeHref={challengeHref}
          onNextAfterSkip={onNextAfterSkip}
          onEndTraining={onEndTraining}
        />
      </div>
    );
  }

  if (isIncorrectResult && lastAnswer.userDiagonal && lastAnswer.userAntiDiagonal) {
    return (
      <div className="max-w-md mx-auto">
        <DiagonalQuizIncorrectResultView
          question={lastAnswer.question}
          correctDiagonal={lastAnswer.correctDiagonal}
          correctAntiDiagonal={lastAnswer.correctAntiDiagonal}
          userDiagonal={lastAnswer.userDiagonal}
          userAntiDiagonal={lastAnswer.userAntiDiagonal}
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          challengeHref={challengeHref}
          onNextAfterIncorrect={onNextAfterIncorrect}
          onEndTraining={onEndTraining}
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center">
        <SectionTitle className="mb-4">{t('question', { square: currentSquare })}</SectionTitle>

        <DiagonalAnswerPanel
          currentSquare={currentSquare}
          input={input}
          isDisabled={isDisabled}
          srResultText={
            showResult && lastAnswer
              ? lastAnswer.correct
                ? tp('correct')
                : t('correctAnswer', {
                    diagonal: lastAnswer.correctDiagonal,
                    antiDiagonal: lastAnswer.correctAntiDiagonal,
                  })
              : null
          }
          labels={{
            diagonal: t('diagonalLabel'),
            antiDiagonal: t('antiDiagonalLabel'),
            selectFile: t('selectFile'),
            selectRank: t('selectRank'),
          }}
          diagonalResult={fieldResult}
          antiDiagonalResult={fieldResult}
        />
      </div>

      <TrainingFooter
        correct={correctCount}
        incorrect={incorrectCount}
        onEndTraining={onEndTraining}
        challengeHref={challengeHref}
        onSkip={isDisabled ? undefined : onSkip}
      />
    </div>
  );
}
