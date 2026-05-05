'use client';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { LeaderboardTableHeader } from '@/app/[locale]/(public)/leaderboard/_components/LeaderboardTableHeader';
import { LeaderboardTableRow } from '@/app/[locale]/(public)/leaderboard/_components/LeaderboardTableRow';
import type {
  LeaderboardPeriod,
  LeaderboardRow,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { SectionTitle } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

type Props = {
  rows: LeaderboardRow[];
  detailPath: string;
  locale: string;
  /** Period the rows came from. Defaults to `'weekly'`. */
  period?: LeaderboardPeriod;
};

export function LeaderboardPreview({ rows, detailPath, locale, period = 'weekly' }: Props) {
  const t = useTranslations('leaderboard');

  if (rows.length === 0) {
    return null;
  }

  const titleKey = period === 'all-time' ? 'allTimeRanking' : 'weeklyRanking';
  const title = t(titleKey);

  return (
    <div className="mt-12 space-y-3">
      <SectionTitle>{title}</SectionTitle>
      <div>
        <table className="w-full table-fixed" aria-label={title}>
          <LeaderboardTableHeader />
          <tbody>
            {rows.map((row) => (
              <LeaderboardTableRow
                key={row.userId}
                row={row}
                isCurrentUser={false}
                locale={locale}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-center pt-2">
        <Link
          href={`/${locale}${detailPath}`}
          className={`text-sm font-medium ${TEXT_LINK_CLASSES}`}
        >
          {t('viewMore')}
        </Link>
      </div>
    </div>
  );
}
