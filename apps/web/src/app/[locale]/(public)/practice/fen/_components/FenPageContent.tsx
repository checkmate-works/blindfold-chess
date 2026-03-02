'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { FenSetup } from './FenSetup';
import { FenSetupSkeleton } from './FenSetupSkeleton';
import { TUTORIAL_SKIPPED_KEY } from './TutorialSkipLink';

type Props = {
  locale: Locale;
};

export function FenPageContent({ locale }: Props) {
  const router = useRouter();
  const [tutorialSkipped, setTutorialSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    const skipped = localStorage.getItem(TUTORIAL_SKIPPED_KEY) === 'true';
    setTutorialSkipped(skipped);
  }, []);

  useEffect(() => {
    if (tutorialSkipped === false) {
      router.replace(`/${locale}/practice/fen/tutorial`);
    }
  }, [tutorialSkipped, locale, router]);

  if (tutorialSkipped === null || tutorialSkipped === false) {
    return <FenSetupSkeleton />;
  }

  return <FenSetup locale={locale} />;
}
