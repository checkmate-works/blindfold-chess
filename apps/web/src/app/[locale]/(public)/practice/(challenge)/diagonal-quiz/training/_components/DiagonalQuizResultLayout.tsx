'use client';

import type { ReactNode } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRedo } from 'react-icons/fa';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { SectionTitle } from '@/app/[locale]/_components';

import { DiagonalBoard } from '../../_components/DiagonalQuizProblemList';

type Props = {
  question: string;
  correctCount: number;
  incorrectCount: number;
  onNext: () => void;
  onEndTraining: () => void;
  children: ReactNode;
};

export function DiagonalQuizResultLayout({
  question,
  correctCount,
  incorrectCount,
  onNext,
  onEndTraining,
  children,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const tp = useTranslations('practice');

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-8 text-center relative overflow-hidden shadow-sm">
        <SectionTitle className="mb-4">{t('question', { square: question })}</SectionTitle>

        {children}

        <DiagonalBoard targetSquare={question} />

        <div className="mt-6">
          <Button onClick={onNext} variant="primary" className="w-full">
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
