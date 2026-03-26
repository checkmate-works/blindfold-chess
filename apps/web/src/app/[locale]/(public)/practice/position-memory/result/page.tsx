import { Suspense } from 'react';

import { setRequestLocale } from 'next-intl/server';

import { createPracticeResultMetadata } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './ResultClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const dynamic = 'force-dynamic';

export const generateMetadata = createPracticeResultMetadata({
  i18nKey: 'positionMemory',
  canonicalPath: 'practice/position-memory/result',
});

export default async function PositionMemoryResultPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <>
      <Suspense>
        <ResultClient locale={locale} />
      </Suspense>
      <AdBannerGuard slot="banner-standard" />
    </>
  );
}
