'use client';

import { useTranslations } from 'next-intl';

import { BoardOverlay, Button } from '@/app/_components';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/_components/ScoreCounter';

import { pieceDisplayMap } from '../../_data/constants';
import type { MoveQuestion } from '../../_lib/types';

type Props = {
  currentQuestion: MoveQuestion;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null;
  onAnswer: (answer: boolean) => void;
  getQuestion: (from: string, to: string) => string;
  countdown: number | null;
  correctCount: number;
  incorrectCount: number;
  onEndTraining: () => void;
};

export function LegalMovesTrainingPlaying({
  currentQuestion,
  showResult,
  lastAnswer,
  onAnswer,
  getQuestion,
  countdown,
  correctCount,
  incorrectCount,
  onEndTraining,
}: Props) {
  const t = useTranslations('practice.legalMoves');
  const tp = useTranslations('practice');

  return (
    <div>
      <div className="relative bg-card rounded-2xl border border-border p-8 text-center overflow-hidden">
        {/* Countdown Overlay */}
        <BoardOverlay isVisible={countdown !== null} className="backdrop-blur-md">
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        <div>
          <div className="mb-8 min-h-[160px] flex flex-col items-center justify-center">
            <div
              className={`text-lg font-bold mb-6 transition-colors duration-200 ${
                lastAnswer
                  ? lastAnswer.correct
                    ? 'text-success'
                    : 'text-destructive'
                  : 'text-foreground'
              }`}
            >
              {getQuestion(currentQuestion.from, currentQuestion.to)
                .replace('{from}', currentQuestion.from)
                .replace('{to}', currentQuestion.to)}
            </div>
            <div className="text-7xl">{pieceDisplayMap[currentQuestion.piece]}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onAnswer(true)}
              disabled={showResult || countdown !== null}
              className="px-6 py-4 bg-success/10 hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed text-success border border-success/30 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-2xl">○</span>
              <span>{t('legal')}</span>
            </button>
            <button
              onClick={() => onAnswer(false)}
              disabled={showResult || countdown !== null}
              className="px-6 py-4 bg-destructive/10 hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed text-destructive border border-destructive/30 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-2xl">×</span>
              <span>{t('illegal')}</span>
            </button>
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <div className="mt-6">
        <Button onClick={onEndTraining} variant="outline" size="lg" className="w-full">
          {tp('endTraining')}
        </Button>
      </div>
    </div>
  );
}
