import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle } from '@/app/[locale]/_components';
import { LegalMovesClient } from './_components/LegalMovesClient';
import type { Locale } from '../../_lib/types';

interface LegalMovesPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export async function generateMetadata({ params }: LegalMovesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('practice.legalMoves.title'),
    description: t('practice.legalMoves.description'),
  };
}

export default async function LegalMovesPage({ params }: LegalMovesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('practice.legalMoves.title')}</PageTitle>
        <p className="text-muted-foreground">{t('practice.legalMoves.description')}</p>
      </div>
      <LegalMovesClient locale={locale} />

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.legalMoves.title') },
          ]}
          locale={locale}
        />
      </div>
    </>
  );
}
