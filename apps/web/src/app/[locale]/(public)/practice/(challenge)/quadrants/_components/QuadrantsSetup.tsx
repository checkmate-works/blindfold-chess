'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeHowToPlaySection } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeHowToPlaySection';
import { PracticeSetupActions } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeSetupActions';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useQuadrantsSettings } from '../_hooks/use-quadrants-settings';

type Props = {
  locale: Locale;
};

export function QuadrantsSetup({ locale }: Props) {
  const t = useTranslations('practice.quadrantAnchors');
  const { settings } = useQuadrantsSettings();

  return (
    <div>
      <PracticeHowToPlaySection title={t('howToPlayTitle')} description={t('howToPlayDescription')}>
        <div className="text-4xl font-bold text-foreground mb-3">e4</div>
        <p className="text-sm text-muted-foreground">{t('question', { square: 'e4' })}</p>
      </PracticeHowToPlaySection>

      <PracticeSetupActions
        locale={locale}
        moduleSlug="quadrants"
        challengeHref={`/${locale}/practice/quadrants/challenge`}
        // The training screen takes its orientation from the URL and has no
        // selector of its own, so a bare link would answer every question from
        // a white board no matter what the player picked for the challenge.
        trainingHref={`/${locale}/practice/quadrants/training?orientation=${settings.orientation}#quadrants-training-session`}
      />
    </div>
  );
}
