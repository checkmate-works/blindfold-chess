'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';

import { VALID_PERIODS } from '../_lib/types';

type Props = {
  locale: string;
};

export function PeriodNavigation({ locale }: Props) {
  const t = useTranslations('leaderboard');
  const segment = useSelectedLayoutSegment();

  return (
    <nav className="flex rounded-lg bg-secondary p-1" aria-label={t('periodLabel')}>
      {VALID_PERIODS.map((p) => {
        const isActive = segment === p;
        return (
          <Link
            key={p}
            href={`/${locale}/leaderboard/${p}`}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {t(`period.${p}`)}
          </Link>
        );
      })}
    </nav>
  );
}
