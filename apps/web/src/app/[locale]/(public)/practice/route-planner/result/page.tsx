import { Suspense } from 'react';

import { setRequestLocale } from 'next-intl/server';

import { createPracticeResultMetadata } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { ResultClient } from './ResultClient';

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner/result',
});

export default async function Page(props: LocalePageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <ResultClient locale={locale} adBannerStandard={<AdBannerGuard slot="banner-standard" />} />
    </Suspense>
  );
}
