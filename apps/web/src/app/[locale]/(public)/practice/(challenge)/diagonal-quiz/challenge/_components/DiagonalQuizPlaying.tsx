'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Square } from '@blindfold-chess/types';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { ChallengeSessionVeil } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeSessionVeil';
import { ChallengeStatusHeader } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeStatusHeader';
import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';
import { SectionTitle } from '@/app/[locale]/_components';

import { DiagonalAnswerPanel } from '../../_components/DiagonalAnswerPanel';
import { useKeypadInput } from '../_hooks/use-keypad-input';

type Props = {
  currentSquare: Square;
  timeRemaining: number;
  timeLimit: number;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    isDiagonalCorrect: boolean;
    isAntiDiagonalCorrect: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null;
  onAnswer: (diagonal: string, antiDiagonal: string) => void;
  countdown: number | null;
  correctCount: number;
  incorrectCount: number;
  showStats?: boolean;
  isPaused?: boolean;
  onTogglePause?: () => void;
  remainingLives?: number;
  maxLives?: number;
  onQuitRequest?: () => void;
  showQuitModal?: boolean;
  onQuitConfirm?: () => void;
  onQuitCancel?: () => void;
};

export function DiagonalQuizPlaying({
  currentSquare,
  timeRemaining,
  timeLimit,
  showResult,
  lastAnswer,
  onAnswer,
  countdown,
  correctCount,
  incorrectCount,
  showStats = true,
  isPaused = false,
  onTogglePause,
  remainingLives,
  maxLives,
  onQuitRequest,
  showQuitModal,
  onQuitConfirm,
  onQuitCancel,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const tPractice = useTranslations('practice');
  const isDisabled = showResult || countdown !== null || isPaused;

  // Correct/incorrect is signaled by tinting the answer fields rather than a
  // text flash, so the layout never shifts when a result appears. Each
  // diagonal is graded independently, so a half-right answer shows one green
  // field and one red field instead of tinting both the same.
  const diagonalResult =
    showResult && lastAnswer ? (lastAnswer.isDiagonalCorrect ? 'correct' : 'incorrect') : null;
  const antiDiagonalResult =
    showResult && lastAnswer ? (lastAnswer.isAntiDiagonalCorrect ? 'correct' : 'incorrect') : null;

  const input = useKeypadInput({
    currentSquare,
    showResult,
    isDisabled,
    onAnswer,
  });

  useAlgebraicKeyboardInput({
    onFile: input.handleFilePress,
    onRank: input.handleRankPress,
    onBackspace: input.handleBackspace,
    enabled: !isDisabled,
  });

  return (
    <div className="max-w-md mx-auto">
      <ChallengeSessionVeil
        countdown={countdown}
        isPaused={isPaused}
        onTogglePause={onTogglePause}
        className="py-2 text-center"
      >
        <SectionTitle className="mb-4">{t('question', { square: currentSquare })}</SectionTitle>

        <ChallengeStatusHeader
          className="flex justify-between items-center mb-4 min-h-[40px]"
          remainingLives={remainingLives}
          maxLives={maxLives}
          isPaused={isPaused}
          onTogglePause={onTogglePause}
          pauseDisabled={countdown !== null}
          timeRemaining={timeRemaining}
          timeLimit={timeLimit}
        />

        <DiagonalAnswerPanel
          currentSquare={currentSquare}
          input={input}
          isDisabled={isDisabled}
          srResultText={
            showResult && lastAnswer
              ? lastAnswer.correct
                ? tPractice('correct')
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
          diagonalResult={diagonalResult}
          antiDiagonalResult={antiDiagonalResult}
        />

        {showStats && (
          <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
        )}
      </ChallengeSessionVeil>

      {/* Training mode reuses this component without the quit affordance —
          there is no run to abandon, so none of the handlers are passed. */}
      {onQuitRequest && onQuitConfirm && onQuitCancel && (
        <ChallengeQuitControl
          className="mt-6 text-center"
          onQuitRequest={onQuitRequest}
          showQuitModal={showQuitModal ?? false}
          onQuitConfirm={onQuitConfirm}
          onQuitCancel={onQuitCancel}
        />
      )}
    </div>
  );
}
