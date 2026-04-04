import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
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
      title,
      description,
    }),
    title,
    description,
  };
}

export default async function AlgebraicNotationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.algebraicNotation.pageTitle')}</PageTitle>

      <PagePanel>
        <AlgebraicNotationSetup />

        <Divider />

        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.algebraicNotation.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
