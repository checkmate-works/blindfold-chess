import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { getPositionById } from '@/lib/positions/queries';
import { UUID_RE } from '@/lib/validations/uuid';

import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SinglePositionResult } from '../../_components/single-position/SinglePositionResult';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory' }),
    title: resolveTitle(`${t('title')} - ${t('result')}`, locale),
  };
}

export default async function PositionResultPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const position = await getPositionById({ id, type: 'memory' });

  const adBannerStandard =
    IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM ? (
      <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
    ) : undefined;

  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        ...(position ? [{ label: position.title, href: `/practice/position-memory/${id}` }] : []),
        { label: t('result') },
      ]}
      locale={locale}
    />
  );

  return (
    <Suspense>
      <SinglePositionResult
        locale={locale}
        positionId={id}
        adBannerStandard={adBannerStandard}
        breadcrumb={breadcrumb}
      />
    </Suspense>
  );
}
