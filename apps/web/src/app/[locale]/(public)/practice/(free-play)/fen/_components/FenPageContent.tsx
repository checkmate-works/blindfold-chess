'use client';

import { TutorialGate } from '@/app/[locale]/(public)/practice/_components/TutorialGate';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FenSetup } from './FenSetup';
import { FenSetupSkeleton } from './FenSetupSkeleton';

type Props = {
  locale: Locale;
};

export function FenPageContent({ locale }: Props) {
  return (
    <TutorialGate locale={locale} moduleId="fen" fallback={<FenSetupSkeleton />}>
      <FenSetup locale={locale} />
    </TutorialGate>
  );
}
