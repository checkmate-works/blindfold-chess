'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import KnightTour from './KnightTour';
import { KnightTourSetupSkeleton } from './KnightTourSetupSkeleton';
import { TUTORIAL_SKIPPED_KEY } from './TutorialSkipLink';

type Props = {
  locale: Locale;
  mode?: 'tutorial';
  startingSquare?: string;
};

export function KnightTourPageContent({ locale, mode, startingSquare }: Props) {
  const router = useRouter();
  const [tutorialSkipped, setTutorialSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    const skipped = localStorage.getItem(TUTORIAL_SKIPPED_KEY) === 'true';
    setTutorialSkipped(skipped);
  }, []);

  useEffect(() => {
    // Skip tutorial redirect if in tutorial mode (coming from tutorial page)
    if (mode === 'tutorial') {
      return;
    }
    if (tutorialSkipped === false) {
      router.replace(`/${locale}/practice/knight-tour/tutorial`);
    }
  }, [tutorialSkipped, locale, router, mode]);

  // Tutorial mode: auto-start game with specified settings
  if (mode === 'tutorial') {
    return (
      <KnightTour
        key="tutorial"
        autoStart={true}
        initialStartingSquare={startingSquare || 'a1'}
        initialBlindfoldMode={false}
      />
    );
  }

  if (tutorialSkipped === null || tutorialSkipped === false) {
    return <KnightTourSetupSkeleton />;
  }

  return <KnightTour key="normal" />;
}
