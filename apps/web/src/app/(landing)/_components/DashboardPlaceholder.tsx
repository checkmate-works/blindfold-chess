import type { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { ChallengeCard } from '@/app/_components';

import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';

import { DashboardHero } from './DashboardHero';
import { GameSectionCard } from './GameSectionCard';
import { GameShortcutCard } from './GameShortcutCard';
import { NewGameCard } from './NewGameCard';
import { WelcomeCard } from './WelcomeCard';

type Props = {
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
  locale: string;
  siteName: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export function DashboardPlaceholder({ t, locale, siteName, displayName, avatarUrl }: Props) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardHero t={t} siteName={siteName} />
      <section className="flex flex-wrap justify-center gap-6 px-6 py-12">
        <div className="basis-full flex justify-center">
          <WelcomeCard t={t} locale={locale} displayName={displayName} avatarUrl={avatarUrl} />
        </div>
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
            href="/practice/square-colors/challenge"
            label={t('dashboard.squareColors')}
            icon={PRACTICE_EMOJIS.square_colors}
          />
          <ChallengeCard
            locale={locale}
            href="/practice/coordinate-quiz/challenge"
            label={t('dashboard.coordinateQuiz')}
            icon={PRACTICE_EMOJIS.coordinate_quiz}
          />
          <ChallengeCard
            locale={locale}
            href="/practice/legal-moves/challenge"
            label={t('dashboard.legalMoves')}
            icon={PRACTICE_EMOJIS.legal_moves}
          />
          <ChallengeCard
            locale={locale}
            href="/practice/diagonal-quiz/challenge"
            label={t('dashboard.diagonalQuiz')}
            icon={PRACTICE_EMOJIS.diagonal_quiz}
          />
          <ChallengeCard
            locale={locale}
            href="/practice/board-symmetry/challenge"
            label={t('dashboard.boardSymmetry')}
            icon={PRACTICE_EMOJIS.board_symmetry}
          />
        </GameSectionCard>
        <GameSectionCard label={t('dashboard.topics')} backgroundImage="/images/topic.webp">
          <ChallengeCard
            locale={locale}
            href="/topics/squares"
            label={t('dashboard.topicSquares')}
            icon="🔲"
          />
          <ChallengeCard
            locale={locale}
            href="/topics/openings"
            label={t('dashboard.topicOpenings')}
            icon="📖"
          />
        </GameSectionCard>
      </section>
    </main>
  );
}
