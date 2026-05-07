'use client';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PracticeSetupActions } from '../../_components/PracticeSetupActions';

type Props = {
  locale: Locale;
};

export function BoardSymmetrySetup({ locale }: Props) {
  const t = useTranslations('practice.boardSymmetry');

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
        <div className="mb-6 text-center" data-tour-id="board-symmetry-tutorial">
          <Link
            href={`/${locale}/practice/board-symmetry/tutorial`}
            className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}
          >
            {t('viewTutorial')}
          </Link>
        </div>

        <PracticeSetupActions
          locale={locale}
          moduleSlug="board-symmetry"
          challengeTourId="board-symmetry-challenge"
          trainingTourId="board-symmetry-training"
        />
      </div>
    </div>
  );
}
