'use client';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardPeriod } from '../_lib/types';

type TabValue = 'score' | 'exp';

type Props = {
  activeTab: TabValue;
  locale: string;
  period: LeaderboardPeriod;
};

const TABS: {
  value: TabValue;
  buildHref: (locale: string, period: LeaderboardPeriod) => string;
}[] = [
  { value: 'score', buildHref: (locale, period) => `/${locale}/leaderboard/score/${period}` },
  { value: 'exp', buildHref: (locale, period) => `/${locale}/leaderboard/exp/${period}` },
];

export function LeaderboardTabs({ activeTab, locale, period }: Props) {
  const t = useTranslations('leaderboard');

  return (
    <nav className="flex rounded-lg bg-secondary p-1" role="tablist" aria-label={t('title')}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <Link
            key={tab.value}
            href={tab.buildHref(locale, period)}
            role="tab"
            aria-selected={isActive}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`tabs.${tab.value}`)}
          </Link>
        );
      })}
    </nav>
  );
}
