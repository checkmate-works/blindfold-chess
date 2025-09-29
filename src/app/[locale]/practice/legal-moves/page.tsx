import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle, Divider } from '@/app/[locale]/_components';
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

      <p className="text-muted-foreground">{t('practice.legalMoves.description')}</p>

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
