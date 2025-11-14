import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AdContainer } from '@/components/Ad';

import { generateCanonicalMetadata } from '../_lib/metadata';
import type { Locale } from '../_lib/types';
import { GameListClient } from './_components/GameListClient';
import { NewGameButton } from './_components/NewGameButton';

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
  const t = await getTranslations({ locale, namespace: 'Common' });

  return (
    <div className="space-y-6">
      <div id="new-game-card">
        <NewGameButton locale={locale} />
      </div>

      {/* テスト用広告 */}
      <div className="text-center">
        <AdContainer
          href="https://example.com"
          text={`${t('sponsoredLink')} - ${t('testAd')}`}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        />
      </div>

      <GameListClient locale={locale} />
    </div>
  );
}
