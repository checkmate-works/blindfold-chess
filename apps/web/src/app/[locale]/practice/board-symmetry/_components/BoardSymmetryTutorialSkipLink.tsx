'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

const BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY = 'boardSymmetryTutorialSkipped';

export function BoardSymmetryTutorialSkipLink({ locale }: Props) {
  const t = useTranslations('practice.boardSymmetry');
  const router = useRouter();

  const handleSkip = () => {
    localStorage.setItem(BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY, 'true');
    router.push(`/${locale}/practice/board-symmetry`);
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

export { BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY };
