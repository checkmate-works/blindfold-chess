/**
 * FEN Reconstruction Practice
 *
 * @description
 * Train reading and understanding FEN notation by reconstructing board positions.
 * Users see a FEN string and manually place pieces to recreate the position.
 *
 * @flow
 * 1. Setup Phase (this page): Configure problem count and shuffle option
 * 2. Session Phase: View FEN → Recreate position → View accuracy result
 *    Repeat for each problem in the set
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { FenPageContent } from './_components/FenPageContent';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const title = t('practice.fen.pageTitle');
  const description = t('practice.fen.description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/fen', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function FenPracticePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const breadcrumbItems = [
    { label: t('navigation.practice'), href: '/practice' },
    { label: t('practice.fen.title') },
  ];

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.fen.pageTitle')}</PageTitle>

      <PagePanel>
        <FenPageContent locale={locale} />

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />
        <Breadcrumb items={breadcrumbItems} locale={locale} />
      </PagePanel>
    </div>
  );
}
