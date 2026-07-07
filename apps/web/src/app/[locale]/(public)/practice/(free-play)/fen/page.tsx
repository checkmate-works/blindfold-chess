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

import { buildPracticeIntroHelpTour } from '@/app/[locale]/(public)/practice/_lib/practice-help-tour';
import { PageLayout } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
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
    <PageLayout
      title={t('practice.fen.pageTitle')}
      titleAction={buildPracticeIntroHelpTour(t, 'fen', 'fen', locale)}
      locale={locale}
      breadcrumb={breadcrumbItems}
    >
      <FenPageContent locale={locale} />

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
