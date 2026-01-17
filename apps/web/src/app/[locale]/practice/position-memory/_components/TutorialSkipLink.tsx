'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

const TUTORIAL_SKIPPED_KEY = 'positionMemoryTutorialSkipped';

export function TutorialSkipLink({ locale }: Props) {
  const t = useTranslations('practice.positionMemory');
  const router = useRouter();

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_SKIPPED_KEY, 'true');
    router.push(`/${locale}/practice/position-memory`);
  };

  return (
    <button
      onClick={handleSkip}
      className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
    >
      {t('tutorial.skip')}
    </button>
  );
}

export { TUTORIAL_SKIPPED_KEY };
