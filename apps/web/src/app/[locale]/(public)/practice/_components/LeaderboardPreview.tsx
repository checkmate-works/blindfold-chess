'use client';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { LeaderboardTableHeader } from '@/app/[locale]/(public)/leaderboard/_components/LeaderboardTableHeader';
import { LeaderboardTableRow } from '@/app/[locale]/(public)/leaderboard/_components/LeaderboardTableRow';
import type { LeaderboardRow } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { SectionTitle } from '@/app/[locale]/_components';

type Props = {
  rows: LeaderboardRow[];
  detailPath: string;
  locale: string;
};

export function LeaderboardPreview({ rows, detailPath, locale }: Props) {
  const t = useTranslations('leaderboard');

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 space-y-3">
      <SectionTitle>{t('weeklyRanking')}</SectionTitle>
      <div>
        <table className="w-full table-fixed" aria-label={t('weeklyRanking')}>
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
          className="text-primary hover:underline text-sm font-medium"
        >
          {t('viewMore')}
        </Link>
      </div>
    </div>
  );
}
