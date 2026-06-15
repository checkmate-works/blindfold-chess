import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { FiGitPullRequest } from 'react-icons/fi';

import {
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
 * Owner-side, an empty queue carries no action, so the callout is
 * suppressed entirely (returns `null`) rather than showing a "No
 * suggestions yet" line on every visit to the owner's own position.
 * Non-owners always see it — it is their entry point into the flow.
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

  // Owner with an empty queue: nothing to act on — suppress the banner.
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
