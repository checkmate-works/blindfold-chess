/**
 * Admin Challenge Results (管理画面 チャレンジ結果, `/admin/challenge-results`)
 *
 * @description
 * Every recorded challenge score, with the evidence an admin needs to decide
 * whether it was played honestly, and a way to remove one that was not.
 *
 * Each row carries four signals:
 * - **Pace** — the result's time divided by its answers, in seconds. Every row
 *   has it, including a legacy one, so it is the signal to sort and filter by
 *   (`sort=pace`, `pace=<max seconds per answer>`) when the list is large.
 * - **Source** — whether a server-run attempt recorded the score, or the
 *   client reported it before scores were recorded from server-run attempts
 *   (no attempt is linked: "legacy").
 * - **Mean think** — the attempt's server-measured thinking time divided by
 *   its answers. Only a server-run result has one.
 * - **Refusals** — how many of the player's attempts, in any menu, were
 *   refused for answering implausibly fast.
 *
 * The list does not decide anything. It shows every score, not a list of
 * suspects picked by a rule, and the signals are only filters and columns:
 * legacy scores include honest ones, so drawing a line mechanically would
 * misjudge players. The admin makes the call; thresholds can be considered
 * once there is real data to set them against.
 *
 * Removing a result soft-deletes the row, so the period rankings stop showing
 * it; rebuilds the player's all-time best for that menu and key from what
 * remains; takes back the Exp the result earned; and writes an audit entry
 * with the reason and the removed values. It does not revoke belt ranks or
 * badges already earned. A removed row stays listed under `status=removed`,
 * with the reason on its status cell.
 *
 * Known trade-off, not measured: no index serves `sort=score` or `sort=pace`
 * across all rows, nor the pace bound.
 * The list is admin-only and small, so none was added.
 */
import { getTranslations } from 'next-intl/server';

import { buildAdminListHref } from '@/app/admin/_lib/build-list-href';
import { formatDateTime } from '@/app/admin/_lib/format';
import { resolveUserFilter } from '@/app/admin/_lib/resolve-user-filter';
import {
  createSearchParamsCache,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server';

import { CHALLENGE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import { createAdminClient } from '@/lib/supabase/admin';
import { UUID_RE } from '@/lib/validations/uuid';

import { AdminBadge } from '../_components/AdminBadge';
import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminListSummary } from '../_components/AdminListSummary';
import { AdminPageLayout } from '../_components/AdminPageLayout';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { AdminUserLink } from '../_components/AdminUserLink';
import { ChallengeResultFilters } from './_components/ChallengeResultFilters';
import { DeleteChallengeResultButton } from './_components/DeleteChallengeResultButton';
import {
  type ChallengeResultSignal,
  type ChallengeResultSort,
  type ChallengeResultStatus,
  getChallengeResultListPage,
  listChallengeLeaderboardKeys,
} from './_lib/queries';
import { meanThinkMs, parseMaxPace, secondsPerAnswer } from './_lib/signals';

const SIGNALS = ['legacy', 'refused'] as const satisfies readonly ChallengeResultSignal[];
const STATUSES = ['live', 'removed', 'all'] as const satisfies readonly ChallengeResultStatus[];
const SORTS = ['recent', 'score', 'pace'] as const satisfies readonly ChallengeResultSort[];

const DEFAULT_STATUS: ChallengeResultStatus = 'live';
const DEFAULT_SORT: ChallengeResultSort = 'recent';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  menu: parseAsStringLiteral(CHALLENGE_MENU_TYPES),
  key: parseAsString.withDefault(''),
  user: parseAsString.withDefault(''),
  signal: parseAsStringLiteral(SIGNALS),
  pace: parseAsFloat,
  status: parseAsStringLiteral(STATUSES).withDefault(DEFAULT_STATUS),
  sort: parseAsStringLiteral(SORTS).withDefault(DEFAULT_SORT),
});

/**
 * The player ids a `?user=` value names: the profiles and emails it matches,
 * plus the value itself when it is a user id, so a player can be looked up by
 * the id an audit entry or a report names.
 */
async function resolvePlayerIds(userFilter: string): Promise<string[] | null> {
  if (!userFilter) return null;
  const { matchingIds } = await resolveUserFilter(createAdminClient(), userFilter);
  const ids = UUID_RE.test(userFilter) ? [userFilter.toLowerCase(), ...matchingIds] : matchingIds;
  return [...new Set(ids)];
}

export default async function AdminChallengeResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    page,
    menu,
    key: rawKey,
    user: rawUser,
    signal,
    pace: rawPace,
    status,
    sort,
  } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  const userFilter = rawUser.trim();
  const maxPace = parseMaxPace(rawPace);
  const keyOptions = menu ? await listChallengeLeaderboardKeys(menu) : [];
  // A key is only meaningful within its menu, and one that menu never
  // recorded would select an option the filter does not offer.
  const key = menu && keyOptions.includes(rawKey) ? rawKey : '';

  const { rows, totalCount, currentPage, totalPages, pageSize } = await getChallengeResultListPage(
    {
      menuType: menu,
      leaderboardKey: key || null,
      userIds: await resolvePlayerIds(userFilter),
      signal,
      maxPaceSeconds: maxPace,
      status,
      sort,
    },
    page
  );

  const buildHref = buildAdminListHref('/admin/challenge-results', {
    menu,
    key,
    user: userFilter,
    signal,
    pace: maxPace == null ? null : String(maxPace),
    status: status === DEFAULT_STATUS ? null : status,
    sort: sort === DEFAULT_SORT ? null : sort,
  });

  return (
    <AdminPageLayout breadcrumbs={[{ label: t('challengeResults.title') }]}>
      <ChallengeResultFilters
        current={{
          menu: menu ?? '',
          key,
          user: userFilter,
          signal: signal ?? '',
          pace: maxPace == null ? '' : String(maxPace),
          status,
          sort,
        }}
        menuOptions={CHALLENGE_MENU_TYPES}
        keyOptions={keyOptions}
        signalOptions={[
          { value: 'legacy', label: t('challengeResults.filters.signalLegacy') },
          { value: 'refused', label: t('challengeResults.filters.signalRefused') },
        ]}
        statusOptions={[
          { value: 'live', label: t('challengeResults.filters.statusLive') },
          { value: 'removed', label: t('challengeResults.filters.statusRemoved') },
          { value: 'all', label: t('challengeResults.filters.statusAll') },
        ]}
        sortOptions={[
          { value: 'recent', label: t('challengeResults.filters.sortRecent') },
          { value: 'score', label: t('challengeResults.filters.sortScore') },
          { value: 'pace', label: t('challengeResults.filters.sortPace') },
        ]}
        defaults={{ status: DEFAULT_STATUS, sort: DEFAULT_SORT }}
        labels={{
          menu: t('challengeResults.filters.menu'),
          allMenus: t('challengeResults.filters.allMenus'),
          key: t('challengeResults.filters.key'),
          allKeys: t('challengeResults.filters.allKeys'),
          signal: t('challengeResults.filters.signal'),
          allSignals: t('challengeResults.filters.allSignals'),
          status: t('challengeResults.filters.status'),
          sort: t('challengeResults.filters.sort'),
          sortHint: t('challengeResults.filters.sortHint'),
          maxPace: t('challengeResults.filters.maxPace'),
          maxPacePlaceholder: t('challengeResults.filters.maxPacePlaceholder'),
          user: t('challengeResults.filters.user'),
          userPlaceholder: t('challengeResults.filters.userPlaceholder'),
          apply: t('challengeResults.filters.apply'),
        }}
      />

      <AdminListSummary
        currentPage={currentPage}
        pageSize={pageSize}
        shownCount={rows.length}
        totalCount={totalCount}
        itemLabel={t('challengeResults.itemLabel')}
      />

      <AdminDataTable
        headers={[
          t('challengeResults.columns.player'),
          t('challengeResults.columns.menu'),
          t('challengeResults.columns.score'),
          t('challengeResults.columns.mistakes'),
          t('challengeResults.columns.time'),
          t('challengeResults.columns.recordedAt'),
          t('challengeResults.columns.pace'),
          t('challengeResults.columns.source'),
          t('challengeResults.columns.meanThink'),
          t('challengeResults.columns.refusals'),
          t('challengeResults.columns.status'),
          t('challengeResults.columns.actions'),
        ]}
        items={rows}
        emptyMessage={t('challengeResults.noResultsFound')}
        renderRow={(row) => {
          const isRemoved = row.deletedAt != null;
          const mean = row.attempt ? meanThinkMs(row.attempt.state) : null;
          const pace = secondsPerAnswer(row);
          return (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-3">
                <AdminUserLink
                  userId={row.userId}
                  username={row.username}
                  deletedLabel={t('deletedUser')}
                  provisionalLabel={t('provisionalUser')}
                />
              </td>
              <td className="px-4 py-3">
                <div>{row.menuType}</div>
                <div className="text-xs text-muted-foreground">{row.leaderboardKey}</div>
              </td>
              <td className="px-4 py-3">{row.score}</td>
              <td className="px-4 py-3">{row.incorrectAnswers}</td>
              <td className="px-4 py-3">{row.timeTaken}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDateTime(row.createdAt)}</td>
              <td className="px-4 py-3">
                {pace != null ? pace.toFixed(2) : <span className="text-muted-foreground">-</span>}
              </td>
              <td className="px-4 py-3">
                {row.attempt ? (
                  <span
                    title={t('challengeResults.rulesVersion', {
                      version: row.attempt.rulesVersion,
                    })}
                  >
                    <AdminBadge variant="neutral">
                      {t('challengeResults.badges.serverRun')}
                    </AdminBadge>
                  </span>
                ) : (
                  <AdminBadge variant="caution">{t('challengeResults.badges.legacy')}</AdminBadge>
                )}
              </td>
              <td className="px-4 py-3">
                {mean != null ? Math.round(mean) : <span className="text-muted-foreground">-</span>}
              </td>
              <td className="px-4 py-3">
                {row.refusalCount > 0 ? (
                  <AdminBadge variant="danger">{row.refusalCount}</AdminBadge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                {isRemoved ? (
                  <span title={row.removal?.reason ?? undefined}>
                    <AdminBadge variant="danger">{t('challengeResults.badges.removed')}</AdminBadge>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {formatDateTime(row.removal?.removedAt ?? row.deletedAt)}
                    </span>
                  </span>
                ) : (
                  <AdminBadge variant="success">{t('challengeResults.badges.live')}</AdminBadge>
                )}
              </td>
              <td className="px-4 py-3">
                {!isRemoved && (
                  <DeleteChallengeResultButton
                    resultId={row.id}
                    labels={{
                      button: t('challengeResults.deleteModal.button'),
                      title: t('challengeResults.deleteModal.title'),
                      target: t('challengeResults.deleteModal.target', {
                        player: row.username ?? row.userId,
                        menu: row.menuType,
                        key: row.leaderboardKey,
                        score: row.score,
                      }),
                      description: t('challengeResults.deleteModal.description'),
                      reasonLabel: t('challengeResults.deleteModal.reasonLabel'),
                      reasonPlaceholder: t('challengeResults.deleteModal.reasonPlaceholder'),
                      cancel: t('challengeResults.deleteModal.cancel'),
                      confirm: t('challengeResults.deleteModal.confirm'),
                      reasonRequired: t('challengeResults.deleteModal.reasonRequired'),
                    }}
                  />
                )}
              </td>
            </tr>
          );
        }}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </AdminPageLayout>
  );
}
