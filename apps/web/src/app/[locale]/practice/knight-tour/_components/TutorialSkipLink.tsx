'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

export const TUTORIAL_SKIPPED_KEY = 'knightTourTutorialSkipped';

type Props = {
  locale: Locale;
};

export function TutorialSkipLink({ locale }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.knightTour.tutorial');

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_SKIPPED_KEY, 'true');
    router.push(`/${locale}/practice/knight-tour`);
  };

  return (
    <button
      onClick={handleSkip}
      className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
    >
      {t('skip')}
    </button>
  );
}
