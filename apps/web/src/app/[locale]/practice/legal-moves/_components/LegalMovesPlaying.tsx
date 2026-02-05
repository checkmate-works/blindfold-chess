'use client';

import { useTranslations } from 'next-intl';

import { BoardOverlay } from '@/app/_components';
import { QuizTimer } from '@/components/QuizTimer';

import { SectionTitle } from '@/app/[locale]/_components';
import { AnswerFeedback } from '@/app/[locale]/practice/_components/AnswerFeedback';
import { ScoreCounter } from '@/app/[locale]/practice/_components/ScoreCounter';

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
  countdown: number | null;
  correctCount: number;
  incorrectCount: number;
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
  countdown,
  correctCount,
  incorrectCount,
}: Props) {
  const t = useTranslations('practice.legalMoves');
  return (
    <div>
      {/* Header with Timer */}
      <div className="flex justify-end mb-4 min-h-[50px]">
        <QuizTimer timeRemaining={timeRemaining} progress={timeElapsed / timeLimit} size={50} />
      </div>

      <div className="relative bg-card rounded-2xl border border-border p-8 text-center overflow-hidden">
        {/* Blur entire question area during countdown */}
        <BoardOverlay isVisible={countdown !== null} className="backdrop-blur-md">
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        <SectionTitle className="text-2xl mb-8">
          {getQuestion(currentQuestion.from, currentQuestion.to)
            .replace('{from}', currentQuestion.from)
            .replace('{to}', currentQuestion.to)}
        </SectionTitle>

        <div className="mb-8">
          <div className="text-6xl mb-4">{pieceDisplayMap[currentQuestion.piece]}</div>
          {/* ... */}
          <div className="text-lg text-muted-foreground">
            {t(`pieces.${currentQuestion.piece}`)}
          </div>

          <AnswerFeedback
            isCorrect={lastAnswer?.correct ?? null}
            isVisible={showResult && !!lastAnswer}
            incorrectMessage={
              lastAnswer && !lastAnswer.correct
                ? `${t('incorrect')} (${lastAnswer.isLegal ? t('legal') : t('illegal')})`
                : undefined
            }
            className="mt-4"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onAnswer(true)}
            disabled={showResult || countdown !== null}
            className="px-6 py-4 bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-2xl">○</span>
            <span>{t('legal')}</span>
          </button>
          <button
            onClick={() => onAnswer(false)}
            disabled={showResult || countdown !== null}
            className="px-6 py-4 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-2xl">×</span>
            <span>{t('illegal')}</span>
          </button>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
    </div>
  );
}
