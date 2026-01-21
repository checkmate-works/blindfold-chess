'use client';

import { useTranslations } from 'next-intl';

import { SectionTitle } from '@/app/[locale]/_components';
import { TimeDisplay } from '@/app/[locale]/practice/_components/TimeDisplay';

import { pieceDisplayMap } from '../_data/constants';
import type { MoveQuestion } from '../_lib/types';

type Props = {
  currentQuestion: MoveQuestion;
  timeRemaining: number;
  timeLimit: number;
  timeElapsed: number;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null;
  onAnswer: (answer: boolean) => void;
  getQuestion: (from: string, to: string) => string;
};

export function LegalMovesPlaying({
  currentQuestion,
  timeRemaining,
  timeLimit,
  timeElapsed,
  showResult,
  lastAnswer,
  onAnswer,
  getQuestion,
}: Props) {
  const t = useTranslations('practice.legalMoves');
  return (
    <div>
      {/* Timer display */}
      <TimeDisplay
        timeRemaining={timeRemaining}
        timeLimit={timeLimit}
        timeElapsed={timeElapsed}
        labels={{
          timeRemaining: t('timeRemaining'),
        }}
      />

      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <SectionTitle className="text-2xl mb-8">
          {getQuestion(currentQuestion.from, currentQuestion.to)
            .replace('{from}', currentQuestion.from)
            .replace('{to}', currentQuestion.to)}
        </SectionTitle>

        <div className="mb-8">
          <div className="text-6xl mb-4">{pieceDisplayMap[currentQuestion.piece]}</div>
          <div className="text-lg text-muted-foreground">
            {t(`pieces.${currentQuestion.piece}`)}
          </div>

          {showResult && lastAnswer && (
            <div
              className={`mt-4 text-lg font-medium ${
                lastAnswer.correct
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {lastAnswer.correct
                ? t('correct')
                : `${t('incorrect')} (${lastAnswer.isLegal ? t('legal') : t('illegal')})`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onAnswer(true)}
            disabled={showResult}
            className="px-6 py-4 bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-2xl">○</span>
            <span>{t('legal')}</span>
          </button>
          <button
            onClick={() => onAnswer(false)}
            disabled={showResult}
            className="px-6 py-4 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-2xl">×</span>
            <span>{t('illegal')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
