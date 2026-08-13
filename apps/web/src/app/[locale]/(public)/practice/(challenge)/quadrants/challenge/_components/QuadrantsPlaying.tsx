'use client';

import { useCallback, useRef } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { QuadrantId, QuadrantQuestion } from '@blindfold-chess/features/quadrants';
import { getCorrectQuadrant } from '@blindfold-chess/features/quadrants';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { ChallengeSessionVeil } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeSessionVeil';
import { ChallengeStatusHeader } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeStatusHeader';

import QuadrantBoard from '../../_components/QuadrantBoard';

type Props = {
  currentQuestion: QuadrantQuestion;
  timeRemaining: number;
  timeLimit: number;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  onAnswer: (quadrant: QuadrantId) => void;
  countdown: number | null;
  correctCount: number;
  incorrectCount: number;
  isPaused: boolean;
  onTogglePause: () => void;
  remainingLives: number;
  maxLives: number;
  onQuitRequest: () => void;
  showQuitModal: boolean;
  onQuitConfirm: () => void;
  onQuitCancel: () => void;
};

export function QuadrantsPlaying({
  currentQuestion,
  timeRemaining,
  timeLimit,
  showFeedback,
  lastAnswerCorrect,
  onAnswer,
  countdown,
  correctCount,
  incorrectCount,
  isPaused,
  onTogglePause,
  remainingLives,
  maxLives,
  onQuitRequest,
  showQuitModal,
  onQuitConfirm,
  onQuitCancel,
}: Props) {
  const t = useTranslations('practice.quadrantAnchors');
  const tQuiz = useTranslations('practice.coordinateQuiz');
  const lastSelectedQuadrantRef = useRef<QuadrantId | null>(null);

  const handleAnswer = useCallback(
    (quadrant: QuadrantId) => {
      lastSelectedQuadrantRef.current = quadrant;
      onAnswer(quadrant);
    },
    [onAnswer]
  );

  const correctQuadrant = showFeedback ? getCorrectQuadrant(currentQuestion.square) : undefined;
  const wrongQuadrant =
    showFeedback && lastAnswerCorrect === false ? lastSelectedQuadrantRef.current : undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <ChallengeSessionVeil
        countdown={countdown}
        isPaused={isPaused}
        onTogglePause={onTogglePause}
        className="p-6 text-center space-y-4"
      >
        <div>
          <ChallengeStatusHeader
            className="flex justify-between items-center"
            remainingLives={remainingLives}
            maxLives={maxLives}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
            pauseDisabled={countdown !== null || showFeedback}
            timeRemaining={timeRemaining}
            timeLimit={timeLimit}
          />
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Orientation Indicator */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-full border-2 ${
                  currentQuestion.orientation === 'white'
                    ? 'bg-white border-gray-800 dark:border-gray-600'
                    : 'bg-gray-800 dark:bg-gray-700 border-gray-800 dark:border-gray-600'
                }`}
              />
              <span className="text-sm font-medium text-muted-foreground">
                {currentQuestion.orientation === 'white'
                  ? tQuiz('whiteToMove')
                  : tQuiz('blackToMove')}
              </span>
            </div>
          </div>

          {/* Question */}
          <div className="text-2xl font-bold text-foreground">
            {t('question', { square: currentQuestion.square })}
          </div>

          {/* Quadrant Board */}
          <div className="-mx-6 sm:mx-0">
            <div className="min-h-[120px] flex flex-col justify-center items-center">
              <QuadrantBoard
                correctQuadrant={correctQuadrant}
                wrongQuadrant={wrongQuadrant}
                onQuadrantClick={handleAnswer}
                disabled={showFeedback || countdown !== null || isPaused}
                orientation={currentQuestion.orientation}
              />
            </div>
          </div>
        </div>

        <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
      </ChallengeSessionVeil>

      <ChallengeQuitControl
        className="mt-6 text-center"
        onQuitRequest={onQuitRequest}
        showQuitModal={showQuitModal}
        onQuitConfirm={onQuitConfirm}
        onQuitCancel={onQuitCancel}
      />
    </div>
  );
}
