'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { TUTORIAL_SKIP_CONFIG } from '../../../_lib/tutorial-skip-config';
import { PracticeSetupActions } from '../../_components/PracticeSetupActions';

type Props = {
  locale: Locale;
};

export function BoardSymmetrySetup({ locale }: Props) {
  const t = useTranslations('practice.boardSymmetry');
  const router = useRouter();

  const handleViewTutorial = () => {
    localStorage.removeItem(TUTORIAL_SKIP_CONFIG.boardSymmetry.storageKey);
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
          <button onClick={handleViewTutorial} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
            {t('viewTutorial')}
          </button>
        </div>

        <PracticeSetupActions locale={locale} moduleSlug="board-symmetry" />
      </div>
    </div>
  );
}
