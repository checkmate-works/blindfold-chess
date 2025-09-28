import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/app/[locale]/_components';
import { PositionMemoryClient } from './_components/PositionMemoryClient';
import type { Locale } from '../../_lib/types';

interface PositionMemoryPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export async function generateMetadata({ params }: PositionMemoryPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('practice.positionMemory.title'),
    description: t('practice.positionMemory.description'),
  };
}

export default async function PositionMemoryPage({ params }: PositionMemoryPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('practice.positionMemory.title')}</PageTitle>
        <p className="text-muted-foreground">{t('practice.positionMemory.description')}</p>
      </div>
      <PositionMemoryClient locale={locale} />
    </>
  );
}
