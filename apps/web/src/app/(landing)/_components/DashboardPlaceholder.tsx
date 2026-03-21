import type { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { ChallengeCard } from './ChallengeCard';
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
      <DashboardHero t={t} siteName={siteName} />
      <section className="flex flex-wrap justify-center gap-6 px-6 py-12">
        <GameSectionCard label={t('dashboard.vsAi')}>
          <GameShortcutCard locale={locale} label={t('dashboard.myGames')} />
          <NewGameCard locale={locale} label={t('dashboard.newGame')} />
        </GameSectionCard>
        <GameSectionCard
          label={t('dashboard.challenge')}
          backgroundImage="/images/challenge.webp"
          footer={
            <Link
              href={`/${locale}/leaderboard`}
              className="block text-center text-sm font-medium text-primary hover:text-primary/80 transition-colors rounded-full bg-card/90 backdrop-blur-sm py-1.5 px-4 border border-border/50"
            >
              {t('dashboard.viewLeaderboard')}
            </Link>
          }
        >
          <ChallengeCard
            locale={locale}
            href="/practice/square-colors?mode=timed"
            label={t('dashboard.squareColors')}
            icon="🎨"
          />
          <ChallengeCard
            locale={locale}
            href="/practice/coordinate-quiz?mode=timed"
            label={t('dashboard.coordinateQuiz')}
            icon="🎯"
          />
          <ChallengeCard
            locale={locale}
            href="/practice/legal-moves?mode=timed"
            label={t('dashboard.legalMoves')}
            icon="♟️"
          />
        </GameSectionCard>
      </section>
    </main>
  );
}
