import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { AlgebraicNotationSetup } from './_components/AlgebraicNotationSetup';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const title = t('practice.algebraicNotation.pageTitle');
  const description = t('practice.algebraicNotation.description');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: 'practice/algebraic-notation',
      title: title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function AlgebraicNotationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <PageLayout
      title={t('practice.algebraicNotation.pageTitle')}
      locale={locale}
      breadcrumb={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.algebraicNotation.title') },
      ]}
    >
      <AlgebraicNotationSetup />

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
