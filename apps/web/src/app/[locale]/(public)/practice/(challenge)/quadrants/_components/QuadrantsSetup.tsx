'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeHowToPlayCard } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeHowToPlayCard';
import { PracticeSetupActions } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeSetupActions';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function QuadrantsSetup({ locale }: Props) {
  const t = useTranslations('practice.quadrantAnchors');

  return (
    <div>
      <PracticeHowToPlayCard title={t('howToPlayTitle')} description={t('howToPlayDescription')}>
        <div className="text-4xl font-bold text-foreground mb-3">e4</div>
        <p className="text-sm text-muted-foreground">{t('question', { square: 'e4' })}</p>
      </PracticeHowToPlayCard>

      <PracticeSetupActions
        locale={locale}
        moduleSlug="quadrants"
        challengeHref={`/${locale}/practice/quadrants/challenge`}
        trainingHref={`/${locale}/practice/quadrants/training#quadrants-training-session`}
      />
    </div>
  );
}
