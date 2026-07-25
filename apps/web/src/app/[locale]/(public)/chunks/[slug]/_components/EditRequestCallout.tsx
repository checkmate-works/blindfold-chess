import Link from 'next/link';

import { FiGitPullRequest } from 'react-icons/fi';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { EditRequestCalloutViewerState } from '../_lib/resolve-chunk-display-state';

type Props = {
  locale: Locale;
  slug: string;
  pendingCount: number;
  /**
   * Generic body shown when the author has not flagged any specific
   * field for feedback. Hidden once `requestedTopicLabels` is non-empty
   * because the more specific copy renders instead. Also hidden for
   * the owner viewer state — see `ownerBody`.
   */
  body: string;
  /**
   * Owner-specific body (e.g. "3 pending suggestions to review" /
   * "No suggestions yet"). When `viewerState === 'owner'` this
   * replaces both `body` and the requested-topics list, because the
   * "the author wants input on X" framing doesn't fit the author
   * themselves — they want the queue state instead. Required when
   * `viewerState === 'owner'`; ignored otherwise.
   */
  ownerBody?: string;
  /**
   * CTA labels keyed by viewer state. The page resolves the four
   * strings from i18n at the call site so the callout itself stays
   * server / client agnostic.
   */
  ctaByState: Record<EditRequestCalloutViewerState, string>;
  viewerState: EditRequestCalloutViewerState;
  /**
   * The fields the author wants targeted feedback on, as {topic key,
   * pre-localized label} pairs (e.g. [{ topic: 'title', label: 'タイトル' }]).
   * When non-empty, the callout swaps the generic body for a list of
   * pills that each deep-link into the suggest-edit form scoped to that
   * field (`edit-requests?topic=<topic>`), so a visitor lands directly
   * on the field their input is wanted for. When empty / undefined, the
   * generic body renders.
   */
  requestedTopics?: readonly { topic: string; label: string }[];
  /**
   * Localized lead-in to the topic list (e.g. "The author is looking
   * for input on:"). Ignored when `requestedTopicLabels` is empty.
   */
  topicLeadIn?: string;
};

/**
 * Draft-only callout placed under the Description section. Surfaces the
 * edit-suggestion workflow as a Qiita-style banner so visitors notice the
 * collaborative entry point without it competing for space with the
 * owner-only action row (Edit / Publish / Delete) at the bottom of the
 * page.
 *
 * Amber palette mirrors the Draft badge in the page title so the page's
 * "this is a workshop state" visual language stays consistent (same tone
 * as the not-translated notice on `articles/[slug]`).
 *
 * `data-tour-id="chunk-edit-requests-link"` is kept on the CTA so the
 * existing HelpTourButton step continues to highlight the right element.
 */
export function EditRequestCallout({
  locale,
  slug,
  pendingCount,
  body,
  ownerBody,
  ctaByState,
  viewerState,
  requestedTopics,
  topicLeadIn,
}: Props) {
  const isOwner = viewerState === 'owner';
  const hasRequestedTopics = !isOwner && !!requestedTopics && requestedTopics.length > 0;
  const cta = ctaByState[viewerState];

  return (
    <div className="rounded-lg border border-amber-200/60 bg-amber-50/60 px-4 py-3 text-sm text-amber-900/90 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100/90">
      {isOwner ? (
        <p>{ownerBody}</p>
      ) : hasRequestedTopics ? (
        <div className="space-y-1">
          {topicLeadIn && (
            <p className="text-xs text-amber-700/90 dark:text-amber-300/80">{topicLeadIn}</p>
          )}
          <ul className="flex flex-wrap gap-1.5">
            {requestedTopics!.map(({ topic, label }) => (
              <li key={topic}>
                <Link
                  href={`/${locale}/chunks/${slug}/edit-requests?topic=${topic}`}
                  className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>{body}</p>
      )}
      <div className="mt-2">
        <Link
          href={`/${locale}/chunks/${slug}/edit-requests`}
          data-tour-id="chunk-edit-requests-link"
          className="flex w-full items-center justify-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-amber-900 hover:border-amber-400 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:border-amber-600 dark:hover:bg-amber-900/60 transition-colors"
        >
          <FiGitPullRequest className="h-3 w-3" aria-hidden />
          {cta}
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
