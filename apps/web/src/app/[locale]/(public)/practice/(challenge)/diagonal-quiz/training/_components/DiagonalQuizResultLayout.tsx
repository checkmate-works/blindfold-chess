'use client';

import type { ReactNode } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Square } from '@blindfold-chess/types';
import { FaRedo } from 'react-icons/fa';

import { TrainingFooter } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingFooter';
import { SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { DiagonalBoard } from '../../_components/DiagonalQuizProblemList';

type Props = {
  question: Square;
  correctCount: number;
  incorrectCount: number;
  challengeHref: string;
  onNext: () => void;
  onEndTraining: () => void;
  children: ReactNode;
};

export function DiagonalQuizResultLayout({
  question,
  correctCount,
  incorrectCount,
  challengeHref,
  onNext,
  onEndTraining,
  children,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const { preferences } = useGamePreferences();

  return (
    <>
      <div className="text-center">
        <SectionTitle className="mb-4">{t('question', { square: question })}</SectionTitle>

        <DiagonalBoard targetSquare={question} boardTheme={preferences.boardTheme} />

        <div className="mt-6">{children}</div>

        <div className="mt-6">
          <Button onClick={onNext} variant="primary" size="lg" className="w-full">
            <FaRedo className="mr-2" />
            {t('nextProblem')}
          </Button>
        </div>
      </div>

      <TrainingFooter
        correct={correctCount}
        incorrect={incorrectCount}
        onEndTraining={onEndTraining}
        challengeHref={challengeHref}
      />
    </>
  );
}
