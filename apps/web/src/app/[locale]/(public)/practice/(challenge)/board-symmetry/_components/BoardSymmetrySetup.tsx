'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight, FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY } from './BoardSymmetryTutorialSkipLink';

type Props = {
  locale: Locale;
};

export function BoardSymmetrySetup({ locale }: Props) {
  const t = useTranslations('practice.boardSymmetry');
  const tp = useTranslations('practice');
  const router = useRouter();

  const handleViewTutorial = () => {
    localStorage.removeItem(BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY);
    router.push(`/${locale}/practice/board-symmetry/tutorial`);
  };

  return (
    <div>
      <div className="mb-8">
        <SectionTitle className="mb-4">{t('howToPlayTitle')}</SectionTitle>

        <div className="mb-2 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">{t('howToPlayDescription')}</p>
          <div className="flex items-center justify-center gap-3 text-foreground">
            <span className="text-lg font-bold">e4</span>
            <FaArrowRight className="text-muted-foreground" />
            <span className="text-lg font-bold">?</span>
          </div>
        </div>
        <div className="mb-6 text-center">
          <button
            onClick={handleViewTutorial}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {t('viewTutorial')}
          </button>
        </div>

        <Link href={`/${locale}/practice/board-symmetry/challenge/session`}>
          <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full">
            {tp('startChallenge')}
          </Button>
        </Link>
        <div className="mt-4 text-center">
          <Link
            href={`/${locale}/practice/board-symmetry/training#board-symmetry-training-session`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tp('switchToTraining')}
          </Link>
        </div>
      </div>
    </div>
  );
}
