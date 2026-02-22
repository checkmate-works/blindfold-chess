'use client';

import { useTranslations } from 'next-intl';

import { BoardOverlay } from '@/app/_components';
import type { Square } from '@blindfold-chess/types';
import { LuPause, LuPlay } from 'react-icons/lu';

import { QuizTimer } from '@/app/[locale]/practice/_components/QuizTimer';
import { ScoreCounter } from '@/app/[locale]/practice/_components/ScoreCounter';

import { CoordinateQuizBoard } from '../../_components/CoordinateQuizBoard';
import type { CoordinateQuestion } from '../../_lib/types';

type Props = {
  currentQuestion: CoordinateQuestion | null;
  timeRemaining: number;
  timeLimit: number;
  timeElapsed: number;
  correctAnswers: number;
  wrongAnswers: number;
  lastClickedSquare: Square | null;
  showFeedback: boolean;
  isCorrect: boolean;
  onSquareClick: (square: Square) => void;
  countdown: number | null;
  isPaused?: boolean;
  onTogglePause?: () => void;
};

export function CoordinateQuizChallengePlaying({
  currentQuestion,
  timeRemaining,
  timeLimit,
  timeElapsed,
  correctAnswers,
  wrongAnswers,
  lastClickedSquare,
  showFeedback,
  isCorrect,
  onSquareClick,
  countdown,
  isPaused = false,
  onTogglePause,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  const tPractice = useTranslations('practice');
  return (
    <div id="quiz-session">
      <div className="bg-card rounded-2xl border border-border p-8 text-center overflow-hidden">
        <div className="max-w-md mx-auto mb-8 relative">
          <div className="mb-4 relative flex items-center justify-center min-h-[50px]">
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-full border-2 ${
                  currentQuestion?.orientation === 'white'
                    ? 'bg-white border-gray-800 dark:border-gray-600'
                    : 'bg-gray-800 dark:bg-gray-700 border-gray-800 dark:border-gray-600'
                }`}
              />
              <span className="text-sm font-medium text-muted-foreground">
                {currentQuestion?.orientation === 'white' ? t('whiteToMove') : t('blackToMove')}
              </span>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {onTogglePause && (
                <button
                  onClick={onTogglePause}
                  className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                  disabled={countdown !== null}
                  aria-label={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? (
                    <LuPlay size={18} className="fill-current" />
                  ) : (
                    <LuPause size={18} className="fill-current" />
                  )}
                </button>
              )}
              <QuizTimer
                timeRemaining={timeRemaining}
                progress={timeLimit > 0 ? timeElapsed / timeLimit : 0}
                size={40}
                fontSize="text-xs"
                strokeWidth={4}
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg">
            {/* Pause Overlay with Play Button */}
            <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40 z-50">
              <button
                onClick={onTogglePause}
                className="bg-white/90 hover:bg-white text-gray-900 rounded-full p-6 shadow-lg transition-all hover:scale-110 active:scale-95 pointer-events-auto"
                aria-label={tPractice('resume')}
              >
                <LuPlay size={48} className="fill-current ml-1" />
              </button>
            </BoardOverlay>

            {/* Countdown Overlay */}
            <BoardOverlay
              isVisible={countdown !== null}
              className="backdrop-blur-md z-50"
              data-testid="countdown-overlay"
            >
              <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
                {countdown !== null && (countdown > 0 ? countdown : 'START!')}
              </span>
            </BoardOverlay>

            <div
              className={`transition-all duration-300 ${isPaused || countdown !== null ? 'blur-sm' : ''}`}
            >
              <CoordinateQuizBoard
                orientation={currentQuestion?.orientation || 'white'}
                onSquareClick={onSquareClick}
                highlightedSquares={
                  countdown === null && showFeedback && currentQuestion
                    ? {
                        ...(lastClickedSquare
                          ? { [lastClickedSquare]: isCorrect ? 'correct' : 'incorrect' }
                          : {}),
                        ...(currentQuestion
                          ? { [currentQuestion.targetSquare]: 'target' as const }
                          : {}),
                      }
                    : {}
                }
              ></CoordinateQuizBoard>

              {/* Target Square Overlay */}
              {currentQuestion && !showFeedback && countdown === null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-6xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-300">
                    {currentQuestion.targetSquare}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctAnswers} incorrect={wrongAnswers} className="mt-4" />
    </div>
  );
}
