'use client';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardRow } from '../_lib/types';
import { CurrentUserRankRow } from './CurrentUserRankRow';
import { LeaderboardTableHeader } from './LeaderboardTableHeader';
import { LeaderboardTableRow } from './LeaderboardTableRow';
import { LeaderboardEmptyState, LeaderboardTableShell } from './LeaderboardTableShell';

type Props = {
  rows: LeaderboardRow[];
  currentUserId: string | null;
  currentUserRank: LeaderboardRow | null;
  locale: string;
  /** Viewer opted out of leaderboards — explains their missing own-rank row. */
  viewerHidden?: boolean;
};

export function LeaderboardTable({
  rows,
  currentUserId,
  currentUserRank,
  locale,
  viewerHidden = false,
}: Props) {
  const t = useTranslations('leaderboard');

  if (rows.length === 0) {
    return <LeaderboardEmptyState message={t('emptyState')} />;
  }

  const footer = currentUserRank ? (
    <CurrentUserRankRow row={currentUserRank} locale={locale} />
  ) : viewerHidden ? (
    <div className="border-t-2 border-border mt-2">
      <p className="px-3 py-3 text-xs text-muted-foreground">
        <Link
          href="/preferences?tab=privacy"
          locale={locale}
          className="underline underline-offset-2 hover:text-foreground"
        >
          {t('hiddenNotice')}
        </Link>
      </p>
    </div>
  ) : null;

  return (
    <LeaderboardTableShell ariaLabel={t('title')} footer={footer}>
      <LeaderboardTableHeader />
      <tbody className="divide-y divide-border">
        {rows.map((row) => (
          <LeaderboardTableRow
            key={row.userId}
            row={row}
            isCurrentUser={row.userId === currentUserId}
            locale={locale}
          />
        ))}
      </tbody>
    </LeaderboardTableShell>
  );
}
