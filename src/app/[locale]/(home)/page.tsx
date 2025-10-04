import { getTranslations } from 'next-intl/server';
import { NewGameButton } from './_components/NewGameButton';
import { GameListClient } from './_components/GameListClient';
import { generateCanonicalMetadata } from '../_lib/metadata';
import type { Metadata } from 'next';
import type { Locale } from '../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });

  return {
    ...generateCanonicalMetadata({ locale, path: '' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;

  return (
    <div className="space-y-6">
      <div id="new-game-card">
        <NewGameButton locale={locale} />
      </div>

      <GameListClient locale={locale} />
    </div>
  );
}
