import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import AlgebraicNotation from '../_components/AlgebraicNotation';
import { questions } from '../_data/questions';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/algebraic-notation/session' }),
    title: `${t('practice.algebraicNotation.pageTitle')} - ${t('practice.algebraicNotation.session')}`,
    description: t('practice.algebraicNotation.description'),
  };
}

export default async function AlgebraicNotationSessionPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.algebraicNotation.pageTitle')}</PageTitle>

      <AlgebraicNotation questions={questions} locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.algebraicNotation.title'), href: '/practice/algebraic-notation' },
          { label: t('practice.algebraicNotation.session') },
        ]}
        locale={locale}
      />
    </div>
  );
}
