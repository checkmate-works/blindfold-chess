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

/**
 * Footer line linking to the privacy tab of the preferences page.
 *
 * `standalone` draws the rule that separates the footer area from the table.
 * Below a `CurrentUserRankRow` that rule is already drawn, so a second one
 * would box the rank row in.
 */
function PrivacySettingsLink({
  label,
  locale,
  standalone,
}: {
  label: string;
  locale: string;
  standalone: boolean;
}) {
  return (
    <div className={standalone ? 'border-t-2 border-border mt-2' : undefined}>
      <p className="px-3 py-3 text-xs text-muted-foreground">
        <Link
          href="/preferences?tab=privacy"
          locale={locale}
          className="underline underline-offset-2 hover:text-foreground"
        >
          {label}
        </Link>
      </p>
    </div>
  );
}

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

  // Named on this page: either highlighted inside the ranking itself, or
  // appended below it as the own-rank row when the viewer's rank falls on
  // another page.
  const viewerIsNamed =
    currentUserRank !== null ||
    (currentUserId !== null && rows.some((r) => r.userId === currentUserId));

  const footer = viewerHidden ? (
    <PrivacySettingsLink label={t('hiddenNotice')} locale={locale} standalone />
  ) : viewerIsNamed ? (
    <>
      {currentUserRank && <CurrentUserRankRow row={currentUserRank} locale={locale} />}
      {/* Seeing their own name is the only moment a viewer who would rather
          not be listed learns that opting out is possible — the setting is
          otherwise buried in preferences, which they have no reason to open. */}
      <PrivacySettingsLink
        label={t('optOutLink')}
        locale={locale}
        standalone={currentUserRank === null}
      />
    </>
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
