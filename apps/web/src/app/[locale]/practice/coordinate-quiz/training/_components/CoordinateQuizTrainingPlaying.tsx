'use client';

import { useTranslations } from 'next-intl';

import { BoardOverlay, Button } from '@/app/_components';
import { Square } from 'chess.js';

import { ScoreCounter } from '@/app/[locale]/practice/_components/ScoreCounter';

import { CoordinateQuizBoard } from '../../_components/CoordinateQuizBoard';
import type { CoordinateQuestion } from '../../_lib/types';

type Props = {
  currentQuestion: CoordinateQuestion | null;
  correctAnswers: number;
  wrongAnswers: number;
  lastClickedSquare: Square | null;
  showFeedback: boolean;
  isCorrect: boolean;
  onSquareClick: (square: Square) => void;
  countdown: number | null;
  onEndTraining: () => void;
};

export function CoordinateQuizTrainingPlaying({
  currentQuestion,
  correctAnswers,
  wrongAnswers,
  lastClickedSquare,
  showFeedback,
  isCorrect,
  onSquareClick,
  countdown,
  onEndTraining,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  const tp = useTranslations('practice');

  return (
    <div>
      <div className="bg-card rounded-2xl border border-border p-8 text-center overflow-hidden">
        <div className="max-w-md mx-auto mb-8 relative">
          <div className="mb-4 flex items-center justify-center min-h-[50px]">
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
          </div>

          <div className="relative overflow-hidden rounded-lg">
            {/* Countdown Overlay */}
            <BoardOverlay isVisible={countdown !== null} className="backdrop-blur-md z-50">
              <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
                {countdown !== null && (countdown > 0 ? countdown : 'START!')}
              </span>
            </BoardOverlay>

            <div className={`transition-all duration-300 ${countdown !== null ? 'blur-sm' : ''}`}>
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

      <div className="mt-6">
        <Button onClick={onEndTraining} variant="outline" size="lg" className="w-full">
          {tp('endTraining')}
        </Button>
      </div>
    </div>
  );
}
