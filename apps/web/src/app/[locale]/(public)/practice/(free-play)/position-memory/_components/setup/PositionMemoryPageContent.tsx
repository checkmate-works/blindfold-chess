'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { TUTORIAL_SKIPPED_KEY } from '../../_lib/session-config';
import { PositionMemorySetup } from './PositionMemorySetup';
import { PositionMemorySetupSkeleton } from './PositionMemorySetupSkeleton';

type Props = {
  locale: Locale;
};

export function PositionMemoryPageContent({ locale }: Props) {
  const router = useRouter();
  const [tutorialSkipped, setTutorialSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    const skipped = localStorage.getItem(TUTORIAL_SKIPPED_KEY) === 'true';
    setTutorialSkipped(skipped);
  }, []);

  useEffect(() => {
    if (tutorialSkipped === false) {
      router.replace(`/${locale}/practice/position-memory/tutorial`);
    }
  }, [tutorialSkipped, locale, router]);

  if (tutorialSkipped === null || tutorialSkipped === false) {
    return <PositionMemorySetupSkeleton />;
  }

  return (
    <PositionMemorySetup
      locale={locale}
      urlError={null}
      urlFens={null}
      urlTimeLimit={null}
      urlShuffle={null}
    />
  );
}
