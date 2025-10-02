import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle, PageDescription, Divider } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '../../_lib/metadata';
import { LegalMoves } from './_components/LegalMoves';
import type { Locale } from '../../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/legal-moves' }),
    title: t('practice.legalMoves.title'),
    description: t('practice.legalMoves.description'),
  };
}

export default async function LegalMovesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.legalMoves.title')}</PageTitle>

      <PageDescription>{t('practice.legalMoves.description')}</PageDescription>

      <LegalMoves locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.legalMoves.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
