'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

function QuadrantsAfterContent({ locale }: { locale: Locale }) {
  const t = useTranslations('practice.quadrantAnchors');
  const tPractice = useTranslations('practice');

  return (
    <PracticeLayout>
      <PracticePanel className="p-6 mt-8 space-y-3">
        <SectionTitle>{tPractice('relatedLearning')}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardLink
            href="/learn/coordinates/anchor-squares"
            icon="⚓"
            title={t('articles.anchorSquares.title')}
            description={t('articles.anchorSquares.description')}
            locale={locale}
          />
        </div>
      </PracticePanel>
    </PracticeLayout>
  );
}

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'quadrants',
  i18nKey: 'quadrantAnchors',
  buildTryAgainUrl: (ctx) => `/${ctx.locale}/practice/quadrants/challenge`,
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/quadrants`,
  showSignUpBanner: false,
  labelOverrides: (ctx) => ({
    score: ctx.tPractice('correctAnswers'),
    averageTime: undefined,
  }),
  renderAfterComplete: (ctx, adBanner) => (
    <>
      {adBanner}
      <QuadrantsAfterContent locale={ctx.locale} />
    </>
  ),
});
