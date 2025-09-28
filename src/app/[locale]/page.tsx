import { getTranslations } from 'next-intl/server';
import { GameListClient } from './_components/GameListClient';
import type { Metadata } from 'next';
import type { Locale } from './_lib/types';

interface Props {
  params: Promise<{
    locale: Locale;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <GameListClient locale={locale} />
    </div>
  );
}
