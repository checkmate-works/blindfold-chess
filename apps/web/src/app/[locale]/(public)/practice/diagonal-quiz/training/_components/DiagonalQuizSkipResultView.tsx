'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaRedo } from 'react-icons/fa';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/_components/ScoreCounter';
import { SectionTitle } from '@/app/[locale]/_components';

import { DiagonalBoard } from '../../_components/DiagonalQuizProblemList';

type Props = {
  question: string;
  correctDiagonal: string;
  correctAntiDiagonal: string;
  correctCount: number;
  incorrectCount: number;
  onNextAfterSkip: () => void;
  onEndTraining: () => void;
};

export function DiagonalQuizSkipResultView({
  question,
  correctDiagonal,
  correctAntiDiagonal,
  correctCount,
  incorrectCount,
  onNextAfterSkip,
  onEndTraining,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const tp = useTranslations('practice');

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-8 text-center relative overflow-hidden shadow-sm">
        <SectionTitle className="mb-4">{t('question', { square: question })}</SectionTitle>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">
            {t('correctAnswer', {
              diagonal: correctDiagonal,
              antiDiagonal: correctAntiDiagonal,
            })}
          </p>
        </div>

        <DiagonalBoard targetSquare={question} />

        <div className="mt-6">
          <Button onClick={onNextAfterSkip} variant="primary" className="w-full">
            <FaRedo className="mr-2" />
            {t('nextProblem')}
          </Button>
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
    </>
  );
}
