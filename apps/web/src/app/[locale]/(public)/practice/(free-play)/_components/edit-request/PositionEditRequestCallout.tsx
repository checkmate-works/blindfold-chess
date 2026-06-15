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
  ownerId: string;
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
 * amber action banner is suppressed — but if the position has resolved
 * history (accepted / rejected / withdrawn requests), a quiet "history"
 * link is shown instead so the trail of what was changed via edit requests
 * stays discoverable from the position page. Non-owners always see the
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

  const [pendingCount, totalCount, viewerPendingId, t] = await Promise.all([
    countPendingEditRequestsForPosition(positionId),
    countEditRequestsForPosition(positionId),
    isOwner ? Promise.resolve(null) : getViewerPendingEditRequestForPosition(positionId, viewerId),
    getTranslations({ locale, namespace: 'practice.positionEditRequests' }),
  ]);
  const resolvedCount = totalCount - pendingCount;

  const viewerState: CalloutViewerState = !viewerId
    ? 'signedOut'
    : isOwner
      ? 'owner'
      : viewerPendingId
        ? 'hasPending'
        : 'canSuggest';

  // Owner with an empty pending queue: no review action. Fall back to a
  // quiet history link when there is resolved history, else suppress.
  if (viewerState === 'owner' && pendingCount === 0) {
    if (resolvedCount === 0) return null;
    return (
      <div>
        <Link
          href={href as '/practice/position-memory/[id]/edit-requests'}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FiClock className="h-3 w-3" aria-hidden />
          {t('callout.historyLink', { count: resolvedCount })}
        </Link>
      </div>
    );
  }

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
