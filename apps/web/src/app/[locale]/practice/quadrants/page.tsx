import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import QuadrantQuizSetup from './_components/QuadrantQuizSetup';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/quadrants' }),
    title: t('practice.quadrantAnchors.title'),
    description: t('practice.quadrantAnchors.description'),
  };
}

export default async function QuadrantAnchorsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.quadrantAnchors.title')}</PageTitle>

      <QuadrantQuizSetup locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.quadrantAnchors.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
