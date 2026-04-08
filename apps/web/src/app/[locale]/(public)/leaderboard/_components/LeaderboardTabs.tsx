'use client';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type TabValue = 'score' | 'exp';

type Props = {
  activeTab: TabValue;
  locale: string;
};

const TABS: { value: TabValue; href: (locale: string) => string }[] = [
  { value: 'score', href: (locale) => `/${locale}/leaderboard` },
  { value: 'exp', href: (locale) => `/${locale}/leaderboard/exp` },
];

export function LeaderboardTabs({ activeTab, locale }: Props) {
  const t = useTranslations('leaderboard');

  return (
    <nav className="flex rounded-lg bg-secondary p-1" role="tablist" aria-label={t('title')}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <Link
            key={tab.value}
            href={tab.href(locale)}
            role="tab"
            aria-selected={isActive}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`tabs.${tab.value}`)}
          </Link>
        );
      })}
    </nav>
  );
}
