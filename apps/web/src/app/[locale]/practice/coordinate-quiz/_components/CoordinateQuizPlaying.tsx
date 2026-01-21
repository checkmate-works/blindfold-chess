'use client';

import { useTranslations } from 'next-intl';

import { Square } from 'chess.js';

import { SectionTitle } from '@/app/[locale]/_components';
import { TimeDisplay } from '@/app/[locale]/practice/_components/TimeDisplay';

import type { CoordinateQuestion } from '../_lib/types';
import { formatTime } from '../_lib/utils';
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
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  return (
    <div>
      {/* Timer display with score */}
      <TimeDisplay
        timeRemaining={timeRemaining}
        timeLimit={timeLimit}
        timeElapsed={timeElapsed}
        labels={{
          timeRemaining: t('timeRemaining'),
        }}
        formatTime={formatTime}
        leftContent={`${t('correct')}: ${correctAnswers} / ${t('wrong')}: ${wrongAnswers}`}
      />

      {currentQuestion && (
        <div className="text-center mb-8">
          <SectionTitle className="text-4xl font-bold mb-2">
            {currentQuestion.targetSquare}
          </SectionTitle>
          <p className="text-lg text-muted-foreground">{t('clickSquare')}</p>
        </div>
      )}

      <div className="max-w-md mx-auto mb-8">
        <div className="mb-2 text-center flex items-center justify-center gap-2">
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
        <CoordinateQuizBoard
          orientation={currentQuestion?.orientation || 'white'}
          onSquareClick={onSquareClick}
          highlightedSquares={
            showFeedback && lastClickedSquare && currentQuestion
              ? {
                  [lastClickedSquare]: isCorrect ? 'correct' : 'incorrect',
                  [currentQuestion.targetSquare]: 'target',
                }
              : {}
          }
        />
      </div>

      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          {t('correct')}: {correctAnswers}
        </span>
        <span>
          {t('wrong')}: {wrongAnswers}
        </span>
      </div>
    </div>
  );
}
