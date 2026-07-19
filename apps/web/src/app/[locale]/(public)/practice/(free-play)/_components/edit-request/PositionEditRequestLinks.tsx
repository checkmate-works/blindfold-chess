import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { FiClock } from 'react-icons/fi';

import {
  countEditRequestsForPosition,
  countPendingEditRequestsForPosition,
} from '@/lib/position-edit-requests/queries';
import type { PositionType } from '@/lib/positions/types';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
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
 * "Suggest a pattern" entry point into the chunk-link edit-suggestion
 * workflow, rendered inside the expanded "Useful patterns" section on a
 * position detail page (the `RelatedTags` `action` slot). Replaces the
 * former amber `PositionEditRequestCallout` banner — the suggestion
 * affordance now lives where the suggested content itself appears, instead
 * of shouting from its own box. Styled as a centered text link (with an
 * emoji for presence) rather than a button, so it never competes with the
 * primary "Start solving" CTA directly below the section. Hidden for the
 * owner (they edit directly); signed-out visitors land on the edit-requests
 * page, which handles the sign-in prompt.
 */
export async function PositionEditRequestSuggestLink({
  positionId,
  positionType,
  viewerId,
  ownerId,
  locale,
}: Props) {
  const href = editRequestsPath(positionType, positionId);
  if (!href) return null;

  const isOwner = !!viewerId && viewerId === ownerId;
  if (isOwner) return null;

  const t = await getTranslations({ locale, namespace: 'practice.positionEditRequests' });

  return (
    <div className="text-center">
      <Link
        href={href as '/practice/position-memory/[id]/edit-requests'}
        locale={locale}
        className={`text-sm ${TEXT_LINK_CLASSES}`}
      >
        <span aria-hidden>💡</span> {t('suggestCta')}
      </Link>
    </div>
  );
}

/**
 * Quiet "Edit request history (n)" link for the position owner, slotted into
 * the like row (right-aligned). Shown whenever the position has any edit
 * requests — including pending ones, which is now the owner's on-page entry
 * into reviewing them (the former amber review banner is gone). `ml-auto`
 * keeps it pinned to the right even when a narrow viewport wraps it onto
 * its own line.
 *
 * All counts are `cache()`-wrapped, so sharing queries with the sibling
 * `PositionEditRequestSuggestLink` costs no extra DB round-trips.
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
  if (totalCount === 0) return null;

  return (
    <Link
      href={href as '/practice/position-memory/[id]/edit-requests'}
      locale={locale}
      className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <FiClock className="h-3 w-3" aria-hidden />
      {t('callout.historyLink', { count: totalCount })}
      {pendingCount > 0 && (
        <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
          {t('pendingCount', { count: pendingCount })}
        </span>
      )}
    </Link>
  );
}
