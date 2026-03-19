'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import type { LeaderboardRow } from '../_lib/types';

type Props = {
  rows: LeaderboardRow[];
  currentUserId: string | null;
  currentUserRank: LeaderboardRow | null;
  locale: string;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 font-bold text-sm">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 font-bold text-sm">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-bold text-sm">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 text-muted-foreground text-sm font-medium">
      {rank}
    </span>
  );
}

function PlayerCell({ row, locale }: { row: LeaderboardRow; locale: string }) {
  const name = row.displayName ?? row.username;

  return (
    <Link href={`/${locale}/@/${row.username}`} className="flex items-center gap-3 min-w-0">
      {row.avatarUrl ? (
        <Image
          src={row.avatarUrl}
          alt={name}
          width={32}
          height={32}
          className="rounded-full object-cover h-8 w-8 flex-shrink-0"
          unoptimized
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
          <span className="text-sm font-medium">{name.charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="min-w-0">
        <span className="text-sm font-medium text-foreground truncate block">{name}</span>
      </div>
      {row.country && (
        <span className="text-xs text-muted-foreground flex-shrink-0" title={row.country}>
          {row.country}
        </span>
      )}
      {row.flair && <span className="text-xs flex-shrink-0">{row.flair}</span>}
    </Link>
  );
}

function LeaderboardTableRow({
  row,
  isCurrentUser,
  locale,
}: {
  row: LeaderboardRow;
  isCurrentUser: boolean;
  locale: string;
}) {
  return (
    <tr
      className={`border-b border-border last:border-b-0 transition-colors ${
        isCurrentUser ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-muted/50'
      }`}
    >
      <td className="py-3 px-3 text-center">
        <RankBadge rank={row.rank} />
      </td>
      <td className="py-3 px-3">
        <PlayerCell row={row} locale={locale} />
      </td>
      <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground">
        {row.score}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
        {row.incorrectAnswers}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
        {formatTime(row.timeTaken)}
      </td>
    </tr>
  );
}

export function LeaderboardTable({ rows, currentUserId, currentUserRank, locale }: Props) {
  const t = useTranslations('leaderboard');

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">{t('emptyState')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="overflow-x-auto">
        <table className="w-full" aria-label={t('title')}>
          <thead>
            <tr className="border-b-2 border-border">
              <th className="py-3 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">
                {t('table.rank')}
              </th>
              <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('table.player')}
              </th>
              <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">
                {t('table.score')}
              </th>
              <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                {t('table.incorrect')}
              </th>
              <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">
                {t('table.time')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <LeaderboardTableRow
                key={row.userId}
                row={row}
                isCurrentUser={row.userId === currentUserId}
                locale={locale}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Current user rank footer */}
      {currentUserRank && (
        <div className="border-t-2 border-border mt-2">
          <div className="bg-primary/5 dark:bg-primary/10 rounded-b-lg">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-3 px-3 text-center w-16">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {t('yourRank')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center w-16">
                    <RankBadge rank={currentUserRank.rank} />
                  </td>
                  <td className="py-3 px-3">
                    <PlayerCell row={currentUserRank} locale={locale} />
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground w-20">
                    {currentUserRank.score}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-muted-foreground w-24">
                    {currentUserRank.incorrectAnswers}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-muted-foreground w-20">
                    {formatTime(currentUserRank.timeTaken)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
