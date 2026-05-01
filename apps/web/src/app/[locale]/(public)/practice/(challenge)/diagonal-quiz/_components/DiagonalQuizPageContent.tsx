'use client';

import { TutorialGate } from '@/app/[locale]/(public)/practice/_components/TutorialGate';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizSetup } from './DiagonalQuizSetup';

type Props = {
  locale: Locale;
};

export function DiagonalQuizPageContent({ locale }: Props) {
  return (
    <TutorialGate locale={locale} moduleId="diagonalQuiz">
      <DiagonalQuizSetup locale={locale} />
    </TutorialGate>
  );
}
