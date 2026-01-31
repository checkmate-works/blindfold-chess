'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import BoardSymmetrySettings from './BoardSymmetrySettings';
import { BoardSymmetrySetupSkeleton } from './BoardSymmetrySetupSkeleton';
import { BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY } from './BoardSymmetryTutorialSkipLink';

type Props = {
  locale: Locale;
};

export function BoardSymmetryPageContent({ locale }: Props) {
  const router = useRouter();
  const [tutorialSkipped, setTutorialSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    const skipped = localStorage.getItem(BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY) === 'true';
    setTutorialSkipped(skipped);
  }, []);

  useEffect(() => {
    if (tutorialSkipped === false) {
      router.replace(`/${locale}/practice/board-symmetry/tutorial`);
    }
  }, [tutorialSkipped, locale, router]);

  if (tutorialSkipped === null || tutorialSkipped === false) {
    return <BoardSymmetrySetupSkeleton />;
  }

  return <BoardSymmetrySettings locale={locale} />;
}
