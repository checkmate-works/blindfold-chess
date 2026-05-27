import type { getTranslations } from 'next-intl/server';

import { DailyPuzzleCard } from './DailyPuzzleCard';
import { DashboardHero } from './DashboardHero';
import { LatestAnnouncements } from './LatestAnnouncements';
import { LatestArticles } from './LatestArticles';
import { WelcomeCard } from './WelcomeCard';

type Props = {
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
  locale: string;
  siteName: string;
  displayName: string | null;
  avatarUrl: string | null;
  userId?: string;
};

export function DashboardPlaceholder({
  t,
  locale,
  siteName,
  displayName,
  avatarUrl,
  userId,
}: Props) {
  return (
    <main className="min-h-screen bg-secondary/30 text-foreground pb-20">
      <DashboardHero t={t} siteName={siteName} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 space-y-12">
        {/* Welcome Section */}
        <div className="flex justify-center">
          <WelcomeCard t={t} locale={locale} displayName={displayName} avatarUrl={avatarUrl} />
        </div>

        {/* Daily Puzzle Section */}
        <div className="flex justify-center">
          <DailyPuzzleCard locale={locale} />
        </div>

        {/* Articles Section */}
        <div>
          <LatestArticles locale={locale} />
        </div>

        {/* Announcements Section */}
        <div>
          <LatestAnnouncements locale={locale} userId={userId} />
        </div>
      </div>
    </main>
  );
}
