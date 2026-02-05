'use client';

import { useTranslations } from 'next-intl';

import { BoardOverlay } from '@/app/_components';
import { QuizTimer } from '@/components/QuizTimer';
import { Square } from 'chess.js';

import { AnswerFeedback } from '../../_components/AnswerFeedback';
import { ScoreCounter } from '../../_components/ScoreCounter';
import type { CoordinateQuestion } from '../_lib/types';
import { CoordinateQuizBoard } from './CoordinateQuizBoard';

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
};

export function CoordinateQuizPlaying({
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
}: Props & { countdown: number | null }) {
  const t = useTranslations('practice.coordinateQuiz');
  return (
    <div id="quiz-session">
      {/* Timer display with score */}

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
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <QuizTimer timeRemaining={timeRemaining} progress={timeElapsed / timeLimit} size={50} />
          </div>
        </div>

        <div className="relative">
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
          >
            {/* Countdown Overlay */}
            <BoardOverlay isVisible={countdown !== null}>
              <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
                {countdown !== null && (countdown > 0 ? countdown : 'START!')}
              </span>
            </BoardOverlay>
          </CoordinateQuizBoard>

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

      <AnswerFeedback isCorrect={isCorrect} isVisible={showFeedback} className="mt-4" />

      <ScoreCounter correct={correctAnswers} incorrect={wrongAnswers} className="mt-4" />
    </div>
  );
}
