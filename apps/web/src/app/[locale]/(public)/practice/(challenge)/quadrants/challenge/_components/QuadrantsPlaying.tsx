'use client';

import { useCallback, useRef } from 'react';

import { BoardOverlay } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { QuadrantId, QuadrantQuestion } from '@blindfold-chess/features/quadrants';
import { getCorrectQuadrant } from '@blindfold-chess/features/quadrants';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { LuPause, LuPlay } from 'react-icons/lu';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';

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
  const tPractice = useTranslations('practice');
  const tQuiz = useTranslations('practice.coordinateQuiz');
  const quitConfirmLabels = useQuitConfirmLabels();
  const lastSelectedQuadrantRef = useRef<QuadrantId | null>(null);
  const timeElapsed = timeLimit - timeRemaining;

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
      <div className="p-6 text-center relative overflow-hidden space-y-4">
        {/* Header: Lives and Timer */}
        <div>
          <div className="flex justify-between items-center">
            {/* Lives */}
            <div className="flex items-center gap-1">
              {Array.from({ length: maxLives }, (_, i) => (
                <span key={i} className="text-destructive">
                  {i < remainingLives ? (
                    <FaHeart className="w-5 h-5" />
                  ) : (
                    <FaRegHeart className="w-5 h-5 opacity-30" />
                  )}
                </span>
              ))}
            </div>
            {/* Timer */}
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePause}
                disabled={countdown !== null || showFeedback}
                className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                aria-label={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? (
                  <LuPlay size={18} className="fill-current" />
                ) : (
                  <LuPause size={18} className="fill-current" />
                )}
              </button>

              <QuizTimer
                timeRemaining={timeRemaining}
                progress={timeLimit > 0 ? timeElapsed / timeLimit : 0}
                size={40}
                fontSize="text-xs"
                strokeWidth={4}
              />
            </div>
          </div>
        </div>

        {/* Countdown Overlay */}
        <BoardOverlay
          isVisible={countdown !== null}
          className="backdrop-blur-md"
          data-testid="countdown-overlay"
        >
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        {/* Pause Overlay */}
        <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40">
          <button
            onClick={onTogglePause}
            className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 transition-all hover:scale-110 active:scale-95 pointer-events-auto"
            aria-label={tPractice('resume')}
          >
            <LuPlay size={48} className="fill-current ml-1" />
          </button>
        </BoardOverlay>

        {/* Content */}
        <div
          className={`transition-all duration-300 space-y-4 ${isPaused ? 'blur-md grayscale opacity-50 pointer-events-none' : ''}`}
        >
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
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <div className="mt-6 text-center">
        <button
          onClick={onQuitRequest}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tPractice('quit')}
        </button>
      </div>

      <QuitConfirmModal
        isOpen={showQuitModal}
        onConfirm={onQuitConfirm}
        onCancel={onQuitCancel}
        labels={quitConfirmLabels}
      />
    </div>
  );
}
