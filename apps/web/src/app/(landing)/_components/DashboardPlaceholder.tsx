import type { getTranslations } from 'next-intl/server';

import type { Locale } from '@/app/[locale]/_lib/types';

import { DashboardHero } from './DashboardHero';
import { GameSectionCard } from './GameSectionCard';
import { GameShortcutCard } from './GameShortcutCard';
import { NewGameCard } from './NewGameCard';

type Props = {
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
  locale: string;
  siteName: string;
};

export function DashboardPlaceholder({ t, locale, siteName }: Props) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardHero t={t} siteName={siteName} locale={locale as Locale} />
      <section className="flex justify-center px-6 py-12">
        <GameSectionCard label={t('dashboard.vsAi')}>
          <GameShortcutCard locale={locale} label={t('dashboard.myGames')} />
          <NewGameCard locale={locale} label={t('dashboard.newGame')} />
        </GameSectionCard>
      </section>
    </main>
  );
}
