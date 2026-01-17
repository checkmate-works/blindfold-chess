'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { MoveSequenceSetup } from './MoveSequenceSetup';
import { TUTORIAL_SKIPPED_KEY } from './TutorialSkipLink';

type Props = {
  locale: Locale;
  urlFen: string | null;
  urlPgn: string | null;
  urlError: string | null;
};

export function MoveSequencePageContent({ locale, urlFen, urlPgn, urlError }: Props) {
  const router = useRouter();
  const [tutorialSkipped, setTutorialSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    // If URL params are present, don't redirect to tutorial
    if (urlFen !== null || urlPgn !== null) {
      setTutorialSkipped(true);
      return;
    }

    const skipped = localStorage.getItem(TUTORIAL_SKIPPED_KEY) === 'true';
    setTutorialSkipped(skipped);
  }, [urlFen, urlPgn]);

  useEffect(() => {
    if (tutorialSkipped === false) {
      router.replace(`/${locale}/practice/move-sequence/tutorial`);
    }
  }, [tutorialSkipped, locale, router]);

  if (tutorialSkipped === null || tutorialSkipped === false) {
    return null;
  }

  return <MoveSequenceSetup locale={locale} urlFen={urlFen} urlPgn={urlPgn} urlError={urlError} />;
}
