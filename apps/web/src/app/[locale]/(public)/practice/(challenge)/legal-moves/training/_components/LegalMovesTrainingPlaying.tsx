'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { TrainingChallengeCTA } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingChallengeCTA';
import { ArrowKeyAnswer } from '@/app/[locale]/(public)/practice/_components/ArrowKeyAnswer';
import type { Locale } from '@/app/[locale]/_lib/types';

import { pieceDisplayMap } from '../../_data/constants';
import type { MoveQuestion } from '../../_lib/types';

type Props = {
  locale: Locale;
  currentQuestion: MoveQuestion;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null;
  onAnswer: (answer: boolean) => void;
  getQuestion: (from: string, to: string) => string;
  correctCount: number;
  incorrectCount: number;
  onEndTraining: () => void;
};

export function LegalMovesTrainingPlaying({
  locale,
  currentQuestion,
  showResult,
  lastAnswer,
  onAnswer,
  getQuestion,
  correctCount,
  incorrectCount,
  onEndTraining,
}: Props) {
  const t = useTranslations('practice.legalMoves');
  const tp = useTranslations('practice');
  const inputDisabled = showResult;

  return (
    <div>
      <div className="relative p-8 text-center overflow-hidden">
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
            <div className="text-7xl select-none">{pieceDisplayMap[currentQuestion.piece]}</div>
          </div>

          <ArrowKeyAnswer
            disabled={inputDisabled}
            bindings={{
              ArrowLeft: { label: t('legal'), onTrigger: () => onAnswer(true) },
              ArrowRight: { label: t('illegal'), onTrigger: () => onAnswer(false) },
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => onAnswer(true)}
                disabled={inputDisabled}
                className="px-6 py-4 bg-success/10 hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed text-success border border-success/30 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2 touch-manipulation select-none"
              >
                <span className="text-2xl">○</span>
                <span>{t('legal')}</span>
              </button>
              <button
                onClick={() => onAnswer(false)}
                disabled={inputDisabled}
                className="px-6 py-4 bg-destructive/10 hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed text-destructive border border-destructive/30 rounded-md font-medium text-lg transition-colors flex items-center justify-center gap-2 touch-manipulation select-none"
              >
                <span className="text-2xl">×</span>
                <span>{t('illegal')}</span>
              </button>
            </div>
          </ArrowKeyAnswer>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <div className="mt-6 text-center">
        <button
          onClick={onEndTraining}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('endTraining')}
        </button>
      </div>

      <TrainingChallengeCTA challengeHref={`/${locale}/practice/legal-moves/challenge/session`} />
    </div>
  );
}
