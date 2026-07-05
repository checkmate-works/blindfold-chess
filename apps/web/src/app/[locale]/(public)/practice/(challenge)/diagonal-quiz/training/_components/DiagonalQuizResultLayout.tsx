'use client';

import type { ReactNode } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRedo } from 'react-icons/fa';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { TrainingChallengeCTA } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingChallengeCTA';
import { SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { DiagonalBoard } from '../../_components/DiagonalQuizProblemList';

type Props = {
  question: string;
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
  const tp = useTranslations('practice');
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

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <div className="mt-6 text-center">
        <button
          onClick={onEndTraining}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('endTraining')}
        </button>
      </div>

      <TrainingChallengeCTA challengeHref={challengeHref} />
    </>
  );
}
