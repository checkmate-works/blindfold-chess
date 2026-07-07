import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SinglePositionResult } from '../../../_components/single-position/SinglePositionResult';
import { SinglePositionResultLoadingSkeleton } from '../../../_components/single-position/SinglePositionResultLoadingSkeleton';
import { resolveCustomProblem } from '../../../_lib/custom-problem';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    token: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  return {
    title: resolveTitle(`${t('title')} - ${t('result')}`, locale),
    robots: { index: false, follow: false },
  };
}

export default async function CustomPositionResultPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  // Validate the token so a tampered/garbage URL 404s instead of rendering an
  // empty result. The run data itself lives entirely in the query string.
  if (!resolveCustomProblem(token)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const adBannerStandard = <AdSlot slot="content-bottom" />;

  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        {
          label: t('custom.title'),
          href: `/practice/position-memory/custom/${token}`,
        },
        { label: t('result') },
      ]}
      locale={locale}
      density="compact"
    />
  );

  return (
    // Fallback covers the soft-navigation gap between loading.tsx resolving and
    // the SinglePositionResult client chunk arriving. That component owns the
    // PagePanel chrome, so without a fallback the page would flash to bare
    // background. Reuse the same skeleton as loading.tsx for a continuous shape.
    <Suspense fallback={<SinglePositionResultLoadingSkeleton />}>
      <SinglePositionResult
        locale={locale}
        sessionPath={`/practice/position-memory/custom/${token}/session`}
        adBannerStandard={adBannerStandard}
        breadcrumb={breadcrumb}
        expInfo={null}
      />
    </Suspense>
  );
}
