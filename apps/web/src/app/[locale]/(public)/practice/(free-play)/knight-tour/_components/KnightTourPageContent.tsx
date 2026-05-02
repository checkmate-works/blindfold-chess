'use client';

import { TutorialGate } from '@/app/[locale]/(public)/practice/_components/TutorialGate';
import type { Locale } from '@/app/[locale]/_lib/types';

import KnightTour from './KnightTour';
import { KnightTourSetupSkeleton } from './KnightTourSetupSkeleton';

type Props = {
  locale: Locale;
};

export function KnightTourPageContent({ locale }: Props) {
  return (
    <TutorialGate locale={locale} moduleId="knightTour" fallback={<KnightTourSetupSkeleton />}>
      <KnightTour />
    </TutorialGate>
  );
}
