import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { FiClock, FiGitPullRequest } from 'react-icons/fi';

import {
  countEditRequestsForPosition,
  countPendingEditRequestsForPosition,
  getViewerPendingEditRequestForPosition,
} from '@/lib/position-edit-requests/queries';
import type { PositionType } from '@/lib/positions/types';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  positionId: string;
  positionType: PositionType;
  /** Authenticated viewer's id; null when signed out. */
  viewerId: string | null;
  /** Position owner's id (positions.user_id is NOT NULL). */
  ownerId: string | null;
  locale: Locale;
};

type CalloutViewerState = 'owner' | 'hasPending' | 'canSuggest' | 'signedOut';

function editRequestsPath(positionType: PositionType, id: string): string | null {
  switch (positionType) {
    case 'memory':
      return `/practice/position-memory/${id}/edit-requests`;
    case 'puzzle':
      return `/practice/puzzle/${id}/edit-requests`;
    case 'sequence':
      // No detail / edit-requests page for sequences.
      return null;
    default: {
      const _exhaustive: never = positionType;
      return _exhaustive;
    }
  }
}

/**
 * Banner on a position detail page that surfaces the chunk-link
 * edit-suggestion workflow as a Qiita-style entry point. Clicking the CTA
 * navigates to the dedicated `/edit-requests` page where the actual form +
 * review list live — the form is intentionally NOT inlined on the detail
 * page (matches the chunk detail / `EditRequestCallout` pattern).
 *
 * Owner-side, an empty *pending* queue carries no review action, so the
 * amber action banner is suppressed — that state is covered by the sibling
 * `PositionEditRequestHistoryLink` instead. Non-owners always see the
 * action banner — it is their entry point into the flow.
 */
export async function PositionEditRequestCallout({
  positionId,
  positionType,
  viewerId,
  ownerId,
  locale,
}: Props) {
  const href = editRequestsPath(positionType, positionId);
  if (!href) return null;

  const isOwner = !!viewerId && viewerId === ownerId;

  const [pendingCount, viewerPendingId, t] = await Promise.all([
    countPendingEditRequestsForPosition(positionId),
    isOwner ? Promise.resolve(null) : getViewerPendingEditRequestForPosition(positionId, viewerId),
    getTranslations({ locale, namespace: 'practice.positionEditRequests' }),
  ]);

  const viewerState: CalloutViewerState = !viewerId
    ? 'signedOut'
    : isOwner
      ? 'owner'
      : viewerPendingId
        ? 'hasPending'
        : 'canSuggest';

  // Owner with an empty pending queue: no review action, no banner. The
  // resolved-history trail stays discoverable via the quiet
  // `PositionEditRequestHistoryLink` in the like row.
  if (viewerState === 'owner' && pendingCount === 0) return null;

  const ctaByState: Record<CalloutViewerState, string> = {
    owner: t('callout.ctaOwner'),
    hasPending: t('callout.ctaHasPending'),
    canSuggest: t('callout.ctaCanSuggest'),
    signedOut: t('callout.ctaSignedOut'),
  };

  const body =
    viewerState === 'owner'
      ? t('callout.ownerBodyWithPending', { count: pendingCount })
      : t('callout.body');

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <p>{body}</p>
      <div className="mt-2">
        <Link
          href={href as '/practice/position-memory/[id]/edit-requests'}
          locale={locale}
          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-amber-900 hover:border-amber-400 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:border-amber-600 dark:hover:bg-amber-900/60 transition-colors"
        >
          <FiGitPullRequest className="h-3 w-3" aria-hidden />
          {ctaByState[viewerState]}
          {pendingCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-800 dark:text-amber-100">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}

/**
 * Quiet "Edit request history (n)" link for the position owner, slotted into
 * the like row (right-aligned). Renders only when the owner has no pending
 * requests to review but the position has resolved history (accepted /
 * rejected / withdrawn) — the trail of what was changed via edit requests
 * stays discoverable without the amber banner. `ml-auto` keeps it pinned to
 * the right even when a narrow viewport wraps it onto its own line.
 *
 * All counts are `cache()`-wrapped, so sharing queries with the sibling
 * `PositionEditRequestCallout` costs no extra DB round-trips.
 */
export async function PositionEditRequestHistoryLink({
  positionId,
  positionType,
  viewerId,
  ownerId,
  locale,
}: Props) {
  const href = editRequestsPath(positionType, positionId);
  if (!href) return null;

  const isOwner = !!viewerId && viewerId === ownerId;
  if (!isOwner) return null;

  const [pendingCount, totalCount, t] = await Promise.all([
    countPendingEditRequestsForPosition(positionId),
    countEditRequestsForPosition(positionId),
    getTranslations({ locale, namespace: 'practice.positionEditRequests' }),
  ]);
  if (pendingCount > 0) return null;
  const resolvedCount = totalCount - pendingCount;
  if (resolvedCount === 0) return null;

  return (
    <Link
      href={href as '/practice/position-memory/[id]/edit-requests'}
      locale={locale}
      className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <FiClock className="h-3 w-3" aria-hidden />
      {t('callout.historyLink', { count: resolvedCount })}
    </Link>
  );
}
