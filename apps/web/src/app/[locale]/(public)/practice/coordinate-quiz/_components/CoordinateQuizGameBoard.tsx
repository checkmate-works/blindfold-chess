'use client';

import { useTranslations } from 'next-intl';

import { BoardOverlay } from '@/app/_components';
import type { Square } from '@blindfold-chess/types';

import type { CoordinateQuestion } from '../_lib/types';
import { CoordinateQuizBoard } from './CoordinateQuizBoard';

type Props = {
  currentQuestion: CoordinateQuestion | null;
  onSquareClick: (square: Square) => void;
  lastClickedSquare: Square | null;
  showFeedback: boolean;
  isCorrect: boolean;
  countdown: number | null;
  isObscured?: boolean;
};

/**
 * Shared game board section for coordinate quiz (training & challenge).
 * Renders orientation indicator, board, target square overlay, and countdown overlay.
 * Obscures the orientation indicator and board when `isObscured` or `countdown` is active.
 */
export function CoordinateQuizGameBoard({
  currentQuestion,
  onSquareClick,
  lastClickedSquare,
  showFeedback,
  isCorrect,
  countdown,
  isObscured = false,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');

  const shouldBlur = isObscured || countdown !== null;

  return (
    <>
      {/* Orientation indicator */}
      <div
        className={`mb-4 flex items-center justify-center gap-2 transition-all duration-300 ${shouldBlur ? 'blur-md opacity-50' : ''}`}
      >
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

      <div className="relative overflow-hidden rounded-lg">
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

        <div className={`transition-all duration-300 ${shouldBlur ? 'blur-sm' : ''}`}>
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
          />

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
    </>
  );
}
