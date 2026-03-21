/**
 * FEN Reconstruction Practice (FEN再構築トレーニング)
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

import { SUPPORTED_LOCALES } from '@/config';

import { Divider, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FenPageContent } from './_components/FenPageContent';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/fen' }),
    title: t('practice.fen.pageTitle'),
    description: t('practice.fen.description'),
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

      <FenPageContent locale={locale} />

      <Divider />
      <Breadcrumb items={breadcrumbItems} locale={locale} />
    </div>
  );
}
